import { supabase } from '../lib/supabase';

// ── Client code: first 3 letters of company name, uppercased ──
function clientCode(companyName) {
  if (!companyName) return 'GEN';
  // Take first word's first 3 chars (skip "The", common prefixes)
  const clean = companyName.replace(/^(the|a|an)\s+/i, '').trim();
  return clean.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'GEN';
}

// ── Generic sequence finder: find next seq for a pattern in a table ──
async function nextSeq(table, idColumn, pattern) {
  try {
    const { data } = await supabase
      .from(table)
      .select(idColumn)
      .like(idColumn, `${pattern}%`)
      .order(idColumn, { ascending: false })
      .limit(1);
    let next = 1;
    if (data && data.length > 0) {
      const last = data[0][idColumn];
      const seq = parseInt(last.split('-').pop(), 10);
      if (!isNaN(seq)) next = seq + 1;
    }
    return next;
  } catch {
    return Math.floor(Math.random() * 900) + 100;
  }
}

// ── ID generators ──────────────────────────────────────────
// Contract: CON-{CLIENT3}-{YEAR}-{SEQ}  e.g. CON-HAR-2026-001
async function generateContractId(companyName) {
  const code = clientCode(companyName);
  const year = new Date().getFullYear();
  const pattern = `CON-${code}-${year}-`;
  const seq = await nextSeq('app_contracts', 'id', pattern);
  return `${pattern}${String(seq).padStart(3, '0')}`;
}

// Invoice: {CONTRACT}-D{DRAW#}  e.g. CON-HAR-2026-001-D03
async function generateInvoiceId(contractId) {
  if (contractId) {
    const pattern = `${contractId}-D`;
    const { data } = await supabase
      .from('pay_applications')
      .select('id')
      .like('id', `${pattern}%`)
      .order('id', { ascending: false })
      .limit(1);
    let seq = 1;
    if (data && data.length > 0) {
      const last = data[0].id;
      const num = parseInt(last.split('-D').pop(), 10);
      if (!isNaN(num)) seq = num + 1;
    }
    return `${contractId}-D${String(seq).padStart(2, '0')}`;
  }
  // Standalone invoice (no contract)
  const year = new Date().getFullYear();
  const pattern = `INV-${year}-`;
  const seq = await nextSeq('pay_applications', 'id', pattern);
  return `${pattern}${String(seq).padStart(4, '0')}`;
}

// Lien Waiver: LW-{INVOICE_ID}  e.g. LW-CON-HAR-2026-001-D03
async function generateWaiverId(invoiceId) {
  if (invoiceId) {
    const base = `LW-${invoiceId}`;
    // Check if one already exists (multiple waivers per invoice)
    const { data } = await supabase
      .from('app_lien_waivers')
      .select('id')
      .like('id', `${base}%`)
      .order('id', { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return base;
    // Append sequence: LW-CON-HAR-2026-001-D03-02
    const lastId = data[0].id;
    if (lastId === base) return `${base}-02`;
    const seq = parseInt(lastId.split('-').pop(), 10);
    return `${base}-${String((!isNaN(seq) ? seq + 1 : 2)).padStart(2, '0')}`;
  }
  const year = new Date().getFullYear();
  const pattern = `LW-${year}-`;
  const seq = await nextSeq('app_lien_waivers', 'id', pattern);
  return `${pattern}${String(seq).padStart(4, '0')}`;
}

// Legacy fallback for other entities (projects, RFIs, etc.)
async function generateId(prefix, table, idColumn = 'id') {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  const seq = await nextSeq(table, idColumn, pattern);
  return `${pattern}${String(seq).padStart(4, '0')}`;
}

// Export for use in UI previews
export { clientCode, generateContractId, generateInvoiceId, generateWaiverId };

// ── Generic CRUD helpers ────────────────────────────────────
export async function fetchAll(table, options = {}) {
  let query = supabase.from(table).select(options.select || '*');
  if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  if (options.filter) options.filter.forEach(f => { query = query.eq(f.column, f.value); });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchById(table, id) {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function insertMany(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw error;
  return data;
}

// ── Change Orders ───────────────────────────────────────────
export const changeOrderService = {
  async list() {
    const { data, error } = await supabase
      .from('app_change_orders')
      .select('*')
      .order('co_date', { ascending: false });
    if (error) throw error;
    // Fetch versions for each CO
    if (data && data.length > 0) {
      const ids = data.map(co => co.id);
      const { data: versions } = await supabase
        .from('change_order_versions')
        .select('*')
        .in('change_order_id', ids)
        .order('version_number', { ascending: true });
      data.forEach(co => {
        co.change_order_versions = (versions || []).filter(v => v.change_order_id === co.id);
      });
    }
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('app_change_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: versions } = await supabase
      .from('change_order_versions')
      .select('*')
      .eq('change_order_id', id)
      .order('version_number', { ascending: true });
    data.change_order_versions = versions || [];
    return data;
  },

  async create(co, versions = []) {
    if (!co.id) co.id = co.co_number || await generateId('CO', 'app_change_orders');
    const { data: coData, error: coErr } = await supabase
      .from('app_change_orders')
      .insert(co)
      .select()
      .single();
    if (coErr) throw coErr;

    if (versions.length > 0) {
      const vRows = versions.map(v => ({ ...v, change_order_id: coData.id }));
      await insertMany('change_order_versions', vRows);
    }
    return coData;
  },

  async updateStatus(id, status) {
    return updateRow('app_change_orders', id, { status });
  },

  async addVersion(changeOrderId, version) {
    return insertRow('change_order_versions', { ...version, change_order_id: changeOrderId });
  },
};

// ── Invoices (= Pay Applications / G702+G703) ──────────────
// In Knowify, Invoice = G702. They are the same document.
// All invoice data lives in the pay_applications table.
export const invoiceService = {
  async list() {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('*')
      .order('application_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async nextNumber() {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('application_no')
      .order('application_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error('Could not fetch next invoice number: ' + error.message);
    const max = data?.application_no ?? 0;
    return max + 1;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // Fetch G703 line items separately
    const { data: lineItems } = await supabase
      .from('pay_application_line_items')
      .select('*')
      .eq('pay_application_id', id)
      .order('sort_order', { ascending: true });
    data.pay_application_line_items = lineItems || [];
    return data;
  },

  async listByContract(contractId) {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('*')
      .eq('contract_id', contractId)
      .order('application_no', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return [];
    // Fetch all line items for these pay apps in one query
    const ids = data.map((pa) => pa.id);
    const { data: lineItems } = await supabase
      .from('pay_application_line_items')
      .select('*')
      .in('pay_application_id', ids)
      .order('sort_order', { ascending: true });
    data.forEach((pa) => {
      pa.pay_application_line_items = (lineItems || []).filter((li) => li.pay_application_id === pa.id);
    });
    return data;
  },

  async create(invoice, lineItems = []) {
    if (!invoice.id) {
      invoice.id = await generateInvoiceId(invoice.contract_id || null);
    }
    const nextNo = await this.nextNumber();
    // Map invoice fields to pay_applications columns
    const payApp = {
      id: invoice.id,
      application_no: nextNo,
      contract_id: invoice.contract_id || null,
      project_id: invoice.project_id || null,
      project_name: invoice.project_name || null,
      owner_name: invoice.client_name || null,
      owner_address: invoice.client_address || null,
      contractor_name: 'Boulder Construction',
      contractor_address: '123 Commerce Way, Newark, NJ 07102',
      contract_for: invoice.project_name || null,
      contract_date: invoice.contract_date || null,
      period_to: invoice.issue_date || null,
      application_date: invoice.issue_date || null,
      original_contract_sum: invoice.original_contract_sum || 0,
      net_change_orders: invoice.net_change_orders || 0,
      contract_sum_to_date: (parseFloat(invoice.original_contract_sum) || 0) + (parseFloat(invoice.net_change_orders) || 0),
      total_completed_and_stored: invoice.total_completed_and_stored || 0,
      retainage_percent: String(invoice.retainage_percent || '2.5'),
      retainage_on_completed: invoice.retainage_on_completed || 0,
      retainage_on_stored: invoice.retainage_on_stored || 0,
      total_retainage: invoice.total_retainage || 0,
      total_earned_less_retainage: invoice.total_earned_less_retainage || 0,
      less_previous_certificates: invoice.previous_payments || 0,
      current_payment_due: invoice.current_payment_due ?? invoice.amount ?? 0,
      balance_to_finish: invoice.balance_to_finish || 0,
      status: invoice.status || 'Pending',
      co_previous_additions: invoice.co_previous_additions || 0,
      co_previous_deductions: invoice.co_previous_deductions || 0,
      co_this_month_additions: invoice.co_this_month_additions || 0,
      co_this_month_deductions: invoice.co_this_month_deductions || 0,
    };

    const { data: paData, error: paErr } = await supabase
      .from('pay_applications')
      .insert(payApp)
      .select()
      .single();
    if (paErr) throw paErr;

    // Save G703 line items
    if (lineItems.length > 0) {
      const rows = lineItems.map((li, i) => ({
        pay_application_id: paData.id,
        item_no: i + 1,
        description: li.description,
        scheduled_value: parseFloat(li.scheduled_value ?? li.scheduledValue ?? 0),
        previous_application: parseFloat(li.previously_completed ?? li.previouslyCompleted ?? li.previous_application ?? 0),
        this_period: parseFloat(li.this_period ?? li.thisPeriod ?? 0),
        materials_stored: parseFloat(li.materials_stored ?? li.materialsStored ?? 0),
        total_completed: parseFloat(li.total_completed ?? li.total ?? 0),
        percent_complete: parseFloat(li.percent_complete ?? 0),
        balance_to_finish: parseFloat(li.balance_to_finish ?? 0),
        retainage: parseFloat(li.retainage ?? 0),
        sort_order: i,
      }));
      await insertMany('pay_application_line_items', rows);
    }
    return paData;
  },

  async updateStatus(id, status, paidDate = null) {
    const updates = { status };
    if (paidDate) updates.paid_date = paidDate;
    return updateRow('pay_applications', id, updates);
  },

  async markSent(id) {
    return updateRow('pay_applications', id, { status: 'Pending' }); // Sent → Pending (awaiting client)
  },

  async markApproved(id) {
    return updateRow('pay_applications', id, { status: 'Approved' });
  },

  async markRejected(id) {
    return updateRow('pay_applications', id, { status: 'Rejected' });
  },

  async markPaid(id) {
    const today = new Date().toISOString().split('T')[0];
    await updateRow('pay_applications', id, { status: 'Paid', paid_date: today });

    // Check if entire contract is now fully paid → update waivers + contract status
    const invoice = await fetchById('pay_applications', id);
    const contractId = invoice?.contract_id;
    if (contractId) {
      const contract = await fetchById('app_contracts', contractId);
      if (contract) {
        const contractValue = parseFloat(contract.contract_value ?? 0);
        const { data: allInvoices } = await supabase
          .from('pay_applications')
          .select('id, total_completed_and_stored, current_payment_due, status')
          .eq('contract_id', contractId);
        const totalCompleted = (allInvoices || [])
          .filter((inv) => inv.status === 'Paid')
          .reduce((s, inv) => s + parseFloat(inv.total_completed_and_stored ?? inv.current_payment_due ?? 0), 0);

        if (contractValue > 0 && totalCompleted >= contractValue) {
          // Mark all waivers on this contract as Final
          const invoiceIds = (allInvoices || []).map((inv) => inv.id);
          if (invoiceIds.length > 0) {
            await supabase.from('app_lien_waivers').update({
              waiver_category: 'Final',
              status: 'Signed',
              waiver_date: today,
            }).in('invoice_id', invoiceIds);
          }
          // Mark contract as Paid
          await updateRow('app_contracts', contractId, { status: 'Paid' });
        }
      }
    }
  },

  // Record a payment against an invoice — handles partial and full payment
  // Checks contract-level totals to determine if waiver should be Final
  async recordPayment(id, amountPaid, totalDue) {
    const paid = parseFloat(amountPaid) || 0;
    const due = parseFloat(totalDue) || 0;
    const invoiceFullyPaid = paid >= due;
    const today = new Date().toISOString().split('T')[0];
    const updates = {
      paid_amount: paid,
      payment_status: invoiceFullyPaid ? 'Full' : 'Partial',
      status: invoiceFullyPaid ? 'Paid' : 'Approved',
      paid_date: invoiceFullyPaid ? today : null,
    };
    await updateRow('pay_applications', id, updates);

    // Check if the entire CONTRACT is now fully paid
    let contractFullyPaid = false;
    const invoice = await fetchById('pay_applications', id);
    const contractId = invoice?.contract_id;
    if (contractId) {
      const contract = await fetchById('app_contracts', contractId);
      if (contract) {
        const contractValue = parseFloat(contract.contract_value ?? 0);
        // Sum total completed (gross) across all paid invoices on this contract
        const { data: allInvoices } = await supabase
          .from('pay_applications')
          .select('total_completed_and_stored, current_payment_due, status')
          .eq('contract_id', contractId);
        const totalCompleted = (allInvoices || [])
          .filter((inv) => inv.status === 'Paid')
          .reduce((s, inv) => s + parseFloat(inv.total_completed_and_stored ?? inv.current_payment_due ?? 0), 0);
        contractFullyPaid = contractValue > 0 && totalCompleted >= contractValue;
      }
    }

    // Auto-update any linked lien waivers for this invoice
    const { data: waivers } = await supabase
      .from('app_lien_waivers')
      .select('id, waiver_category')
      .eq('invoice_id', id);

    if (waivers && waivers.length > 0) {
      for (const w of waivers) {
        if (invoiceFullyPaid) {
          await supabase.from('app_lien_waivers').update({
            status: 'Signed',
            waiver_category: contractFullyPaid ? 'Final' : 'Partial',
            waiver_date: today,
          }).eq('id', w.id);
        } else {
          await supabase.from('app_lien_waivers').update({
            status: 'Pending Signature',
            waiver_category: 'Partial',
            waiver_amount: paid,
          }).eq('id', w.id);
        }
      }
    }

    // If contract is fully paid, also update ALL waivers on this contract to Final
    if (contractFullyPaid && contractId) {
      const { data: allContractInvoices } = await supabase
        .from('pay_applications')
        .select('id')
        .eq('contract_id', contractId);
      const invoiceIds = (allContractInvoices || []).map((inv) => inv.id);
      if (invoiceIds.length > 0) {
        await supabase.from('app_lien_waivers').update({
          waiver_category: 'Final',
          status: 'Signed',
          waiver_date: today,
        }).in('invoice_id', invoiceIds);
      }

      // Also mark the contract as fully paid
      await updateRow('app_contracts', contractId, { status: 'Paid' });
    }

    return updates;
  },

  async markOverdue(id) {
    return updateRow('pay_applications', id, { status: 'Overdue' });
  },

  async delete(id) {
    await supabase.from('app_lien_waivers').delete().eq('invoice_id', id);
    await supabase.from('pay_application_line_items').delete().eq('pay_application_id', id);
    const { error } = await supabase.from('pay_applications').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Pay Applications (G702/G703) ────────────────────────────
export const payAppService = {
  async list() {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('*')
      .order('application_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // Fetch related data separately (no FK joins)
    const { data: lineItems } = await supabase
      .from('pay_application_line_items')
      .select('*')
      .eq('pay_application_id', id)
      .order('sort_order', { ascending: true });
    const { data: drawHistory } = await supabase
      .from('pay_app_draw_history')
      .select('*')
      .eq('pay_application_id', id)
      .order('sort_order', { ascending: true });
    data.pay_application_line_items = lineItems || [];
    data.pay_app_draw_history = drawHistory || [];
    return data;
  },

  async create(payApp, lineItems = []) {
    if (!payApp.id) payApp.id = await generateId('PA', 'pay_applications');
    const { data: paData, error: paErr } = await supabase
      .from('pay_applications')
      .insert(payApp)
      .select()
      .single();
    if (paErr) throw paErr;

    if (lineItems.length > 0) {
      const rows = lineItems.map((li, i) => ({
        ...li,
        pay_application_id: paData.id,
        sort_order: i,
      }));
      await insertMany('pay_application_line_items', rows);
    }
    return paData;
  },

  async updateStatus(id, status) {
    return updateRow('pay_applications', id, { status });
  },

  async updateLineItems(payAppId, lineItems) {
    // Delete existing and re-insert
    await supabase.from('pay_application_line_items').delete().eq('pay_application_id', payAppId);
    if (lineItems.length > 0) {
      const rows = lineItems.map((li, i) => ({
        ...li,
        pay_application_id: payAppId,
        sort_order: i,
      }));
      await insertMany('pay_application_line_items', rows);
    }
  },

  // Auto-calculate G702 summary from G703 line items
  calcSummary(lineItems, originalContractSum, netChangeOrders, retainagePercent, lessPreviousCerts) {
    const contractSumToDate = originalContractSum + netChangeOrders;
    const totalCompleted = lineItems.reduce((s, li) => s + (li.total_completed || 0), 0);
    const totalRetainage = lineItems.reduce((s, li) => s + (li.retainage || 0), 0);
    const totalEarnedLessRetainage = totalCompleted - totalRetainage;
    const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCerts;
    const balanceToFinish = contractSumToDate - totalEarnedLessRetainage;

    return {
      contract_sum_to_date: contractSumToDate,
      total_completed_and_stored: totalCompleted,
      total_retainage: totalRetainage,
      total_earned_less_retainage: totalEarnedLessRetainage,
      current_payment_due: currentPaymentDue,
      balance_to_finish: balanceToFinish,
    };
  },
};

// ── Lien Waivers ────────────────────────────────────────────
export const lienWaiverService = {
  async list() {
    const { data, error } = await supabase
      .from('app_lien_waivers')
      .select('*')
      .order('waiver_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('app_lien_waivers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(waiver) {
    if (!waiver.id) {
      const invoiceId = waiver.invoice_id || waiver.pay_application_id;
      waiver.id = await generateWaiverId(invoiceId);
    }
    return insertRow('app_lien_waivers', waiver);
  },

  async updateStatus(id, status) {
    return updateRow('app_lien_waivers', id, { status });
  },

  async sign(id) {
    return updateRow('app_lien_waivers', id, {
      status: 'Signed',
      waiver_date: new Date().toISOString().split('T')[0],
    });
  },

  // Generate a waiver from a pay application
  async listByInvoice(invoiceId) {
    const { data, error } = await supabase
      .from('app_lien_waivers')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('waiver_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async generateFromPayApp(payApp, signerInfo) {
    // Determine if this is a final waiver by checking total billed vs contract value
    let isFinal = false;
    const contractId = payApp.contract_id;
    if (contractId) {
      const contract = await fetchById('app_contracts', contractId);
      if (contract) {
        const contractValue = parseFloat(contract.contract_value ?? 0);
        // Sum total completed (gross, before retainage) across all invoices on this contract
        const { data: allInvoices } = await supabase
          .from('pay_applications')
          .select('total_completed_and_stored, current_payment_due')
          .eq('contract_id', contractId);
        const totalBilled = (allInvoices || []).reduce(
          (s, inv) => s + parseFloat(inv.total_completed_and_stored ?? inv.current_payment_due ?? 0), 0
        );
        isFinal = contractValue > 0 && totalBilled >= contractValue;
      }
    }
    // Also check balance_to_finish on the pay app itself
    if (!isFinal && parseFloat(payApp.balance_to_finish ?? 0) <= 0) {
      isFinal = true;
    }

    const waiver = {
      waiver_category: isFinal ? 'Final' : 'Partial',
      condition_type: isFinal ? 'Unconditional' : 'Conditional',
      project_id: payApp.project_id,
      project_name: payApp.project_name || '',
      pay_application_id: payApp.id,
      invoice_id: payApp.id,
      signer_name: signerInfo.name,
      furnisher: signerInfo.company,
      owner_contractor: payApp.owner_name,
      job_name_address: payApp.owner_address,
      waiver_amount: isFinal ? 0 : payApp.current_payment_due,
      final_balance: isFinal ? payApp.current_payment_due : 0,
      payment_condition: '',
      signer_company: signerInfo.company,
      signer_title: signerInfo.title,
      waiver_date: new Date().toISOString().split('T')[0],
      status: 'Pending Signature',
    };
    waiver.id = await generateWaiverId(payApp.id);
    return insertRow('app_lien_waivers', waiver);
  },
};

// ── RFIs ────────────────────────────────────────────────────
export const rfiService = {
  async list() {
    return fetchAll('rfis', { order: { column: 'date_submitted', ascending: false } });
  },
  async create(rfi) {
    if (!rfi.id) rfi.id = rfi.rfi_number || await generateId('RFI', 'rfis');
    return insertRow('rfis', rfi);
  },
  async respond(id, response) {
    return updateRow('rfis', id, {
      status: 'Responded',
      response,
      date_responded: new Date().toISOString().split('T')[0],
    });
  },
  async close(id) {
    return updateRow('rfis', id, { status: 'Closed' });
  },
};

// ── Projects ────────────────────────────────────────────────
export const projectService = {
  async list() {
    return fetchAll('app_projects', { order: { column: 'created_at', ascending: false } });
  },
  async getById(id) {
    return fetchById('app_projects', id);
  },
  async create(project) {
    if (!project.id) project.id = await generateId('PRJ', 'app_projects');
    return insertRow('app_projects', project);
  },
  async updateStatus(id, status) {
    return updateRow('app_projects', id, { status });
  },
};

// ── Clients ──────────────────────────────────────────────────
export const clientService = {
  async list() {
    return fetchAll('clients', { order: { column: 'name', ascending: true } });
  },
  async create(client) {
    if (!client.id) client.id = await generateId('CLI', 'clients');
    return insertRow('clients', client);
  },
};

// ── Contracts ───────────────────────────────────────────────
export const contractService = {
  async list() {
    return fetchAll('app_contracts', { order: { column: 'created_at', ascending: false } });
  },
  async getById(id) {
    const contract = await fetchById('app_contracts', id);
    if (!contract) return null;
    const { data: lineItems } = await supabase
      .from('contract_line_items')
      .select('*')
      .eq('contract_id', id)
      .order('sort_order', { ascending: true });
    contract.lineItems = (lineItems || []).map((li) => ({ description: li.description, amount: parseFloat(li.amount) }));
    return contract;
  },
  async create(contract, lineItems = []) {
    if (!contract.id) contract.id = await generateContractId(contract.company || contract.client_name || contract.client);
    const { data: conData, error } = await supabase.from('app_contracts').insert(contract).select().single();
    if (error) throw error;
    if (lineItems.length > 0) {
      const rows = lineItems.map((li, i) => ({
        contract_id: conData.id,
        description: li.description,
        amount: li.amount,
        sort_order: i,
      }));
      await insertMany('contract_line_items', rows);
    }
    return conData;
  },
  async updateStatus(id, status, extra = {}) {
    return updateRow('app_contracts', id, { status, ...extra });
  },
  async update(id, contractRow, lineItems = []) {
    const { error } = await supabase.from('app_contracts').update(contractRow).eq('id', id);
    if (error) throw error;
    await supabase.from('contract_line_items').delete().eq('contract_id', id);
    if (lineItems.length > 0) {
      const rows = lineItems.map((li, i) => ({
        contract_id: id,
        description: li.description,
        amount: li.amount,
        sort_order: i,
      }));
      await insertMany('contract_line_items', rows);
    }
  },
  async delete(id) {
    // Delete all invoices (+ their line items) linked to this contract first
    const { data: invoices } = await supabase
      .from('pay_applications')
      .select('id')
      .eq('contract_id', id);
    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((i) => i.id);
      await supabase.from('pay_application_line_items').delete().in('pay_application_id', invoiceIds);
      await supabase.from('app_lien_waivers').delete().in('invoice_id', invoiceIds);
      await supabase.from('pay_applications').delete().in('id', invoiceIds);
    }
    await supabase.from('contract_line_items').delete().eq('contract_id', id);
    const { error } = await supabase.from('app_contracts').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Employees ──────────────────────────────────────────────
export const employeeService = {
  async list() {
    return fetchAll('app_employees', { order: { column: 'name', ascending: true } });
  },
  async getById(id) {
    return fetchById('app_employees', id);
  },
  async create(employee) {
    if (!employee.id) employee.id = await generateId('EMP', 'app_employees');
    return insertRow('app_employees', employee);
  },
};

// ── Subcontractors ─────────────────────────────────────────
export const subcontractorService = {
  async list() {
    return fetchAll('app_subcontractors', { order: { column: 'name', ascending: true } });
  },
  async getById(id) {
    return fetchById('app_subcontractors', id);
  },
  async create(sub) {
    if (!sub.id) sub.id = await generateId('SUB', 'app_subcontractors');
    return insertRow('app_subcontractors', sub);
  },
};

// ── Documents ──────────────────────────────────────────────
export const documentService = {
  async list() {
    return fetchAll('app_documents', { order: { column: 'upload_date', ascending: false } });
  },
  async create(doc) {
    if (!doc.id) doc.id = await generateId('DOC', 'app_documents');
    return insertRow('app_documents', doc);
  },
};

// ── Timesheet Entries ──────────────────────────────────────
export const timesheetService = {
  async list() {
    return fetchAll('app_timesheets', { order: { column: 'date', ascending: false } });
  },
  async create(entry) {
    if (!entry.id) entry.id = await generateId('TS', 'app_timesheets');
    return insertRow('app_timesheets', entry);
  },
  async updateStatus(id, status) {
    return updateRow('app_timesheets', id, { status });
  },
};

// ── Schedule Events ────────────────────────────────────────
export const scheduleService = {
  async list() {
    return fetchAll('app_schedule_events', { order: { column: 'date', ascending: true } });
  },
  async create(event) {
    if (!event.id) event.id = await generateId('SCH', 'app_schedule_events');
    return insertRow('app_schedule_events', event);
  },
};

// ── Communication Log ──────────────────────────────────────
export const communicationService = {
  async list() {
    return fetchAll('app_communications', { order: { column: 'date', ascending: false } });
  },
  async listByClient(clientId) {
    return fetchAll('app_communications', {
      order: { column: 'date', ascending: false },
      filter: [{ column: 'client_id', value: clientId }],
    });
  },
  async create(entry) {
    if (!entry.id) entry.id = await generateId('COM', 'app_communications');
    return insertRow('app_communications', entry);
  },
};

// ── Job Cost Data ──────────────────────────────────────────
export const jobCostService = {
  async list() {
    return fetchAll('app_job_costs', { order: { column: 'project_id', ascending: true } });
  },
};

// ── Material Catalog ───────────────────────────────────────
export const materialService = {
  async list() {
    return fetchAll('app_materials', { order: { column: 'name', ascending: true } });
  },
};

// ── Revenue Data (Dashboard analytics) ─────────────────────
export const revenueService = {
  async list() {
    return fetchAll('app_revenue_data', { order: { column: 'month', ascending: true } });
  },
};

// ── Notifications ──────────────────────────────────────────
export const notificationService = {
  async list() {
    return fetchAll('app_notifications', { order: { column: 'created_at', ascending: false } });
  },
  async markRead(id) {
    return updateRow('app_notifications', id, { read: true });
  },
};

// ── Sub Pay Applications ───────────────────────────────────
export const subPayAppService = {
  async list() {
    return fetchAll('app_sub_pay_applications', { order: { column: 'application_date', ascending: false } });
  },
  async getById(id) {
    const data = await fetchById('app_sub_pay_applications', id);
    if (!data) return null;
    const { data: lineItems } = await supabase
      .from('sub_pay_application_line_items')
      .select('*')
      .eq('sub_pay_application_id', id)
      .order('sort_order', { ascending: true });
    const { data: drawHistory } = await supabase
      .from('sub_pay_app_draw_history')
      .select('*')
      .eq('sub_pay_application_id', id)
      .order('sort_order', { ascending: true });
    data.lineItems = lineItems || [];
    data.backupDrawHistory = drawHistory || [];
    return data;
  },
};

// ── Estimates ───────────────────────────────────────────────
export const estimateService = {
  async list() {
    return fetchAll('app_estimates', { order: { column: 'created_at', ascending: false } });
  },
  async getById(id) {
    const est = await fetchById('app_estimates', id);
    if (!est) return null;
    const { data: lineItems } = await supabase
      .from('estimate_line_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: true });
    est.lineItems = lineItems || [];
    return est;
  },
  async create(estimate, lineItems = []) {
    if (!estimate.id) estimate.id = await generateId('EST', 'app_estimates');
    const { data: estData, error } = await supabase.from('app_estimates').insert(estimate).select().single();
    if (error) throw error;
    if (lineItems.length > 0) {
      const rows = lineItems.map((li, i) => ({
        estimate_id: estData.id,
        description: li.description,
        quantity: li.quantity || 1,
        unit_cost: li.unitCost || 0,
        total: li.total || (li.quantity * li.unitCost) || 0,
        sort_order: i,
      }));
      await insertMany('estimate_line_items', rows);
    }
    return estData;
  },
  async updateStatus(id, status) {
    return updateRow('app_estimates', id, { status });
  },
};
