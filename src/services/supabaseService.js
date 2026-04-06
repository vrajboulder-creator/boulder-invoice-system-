import { supabase } from '../lib/supabase';

// ── ID generator (text-based, matching app conventions) ─────
function generateId(prefix = 'ID') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${rand}`;
}

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
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
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
      .from('change_orders')
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
      .from('change_orders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    const { data: versions } = await supabase
      .from('change_order_versions')
      .select('*')
      .eq('change_order_id', id)
      .order('version_number', { ascending: true });
    data.change_order_versions = versions || [];
    return data;
  },

  async create(co, versions = []) {
    if (!co.id) co.id = co.co_number || generateId('CO');
    const { data: coData, error: coErr } = await supabase
      .from('change_orders')
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
    return updateRow('change_orders', id, { status });
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

  async getById(id) {
    const { data, error } = await supabase
      .from('pay_applications')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    // Fetch G703 line items separately
    const { data: lineItems } = await supabase
      .from('pay_application_line_items')
      .select('*')
      .eq('pay_application_id', id)
      .order('sort_order', { ascending: true });
    data.pay_application_line_items = lineItems || [];
    return data;
  },

  async create(invoice, lineItems = []) {
    if (!invoice.id) invoice.id = invoice.invoice_number || generateId('INV');
    // Map invoice fields to pay_applications columns
    const payApp = {
      id: invoice.id,
      application_no: parseInt((invoice.invoice_number || invoice.id || '0').replace(/\D/g, '')) || 1,
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
      current_payment_due: invoice.amount || 0,
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
        scheduled_value: li.scheduled_value || li.scheduledValue || 0,
        previous_application: li.previously_completed || li.previouslyCompleted || 0,
        this_period: li.this_period || li.thisPeriod || 0,
        materials_stored: li.materials_stored || li.materialsStored || 0,
        total_completed: li.total_completed || li.total || 0,
        percent_complete: li.percent_complete || 0,
        balance_to_finish: li.balance_to_finish || 0,
        retainage: li.retainage || 0,
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
    return updateRow('pay_applications', id, { status: 'Paid', paid_date: new Date().toISOString().split('T')[0] });
  },

  async markOverdue(id) {
    return updateRow('pay_applications', id, { status: 'Overdue' });
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
      .single();
    if (error) throw error;
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
    if (!payApp.id) payApp.id = generateId('PA');
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
      .from('lien_waivers')
      .select('*')
      .order('waiver_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('lien_waivers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(waiver) {
    if (!waiver.id) waiver.id = generateId('LW');
    return insertRow('lien_waivers', waiver);
  },

  async updateStatus(id, status) {
    return updateRow('lien_waivers', id, { status });
  },

  async sign(id) {
    return updateRow('lien_waivers', id, {
      status: 'Signed',
      waiver_date: new Date().toISOString().split('T')[0],
    });
  },

  // Generate a waiver from a pay application
  async generateFromPayApp(payApp, signerInfo) {
    const waiver = {
      waiver_category: 'Partial',
      condition_type: 'Conditional',
      project_id: payApp.project_id,
      project_name: payApp.project_name || '',
      pay_application_id: payApp.id,
      signer_name: signerInfo.name,
      furnisher: signerInfo.company,
      owner_contractor: payApp.owner_name,
      job_name_address: payApp.owner_address,
      waiver_amount: payApp.current_payment_due,
      final_balance: 0,
      payment_condition: '',
      signer_company: signerInfo.company,
      signer_title: signerInfo.title,
      waiver_date: new Date().toISOString().split('T')[0],
      status: 'Pending Signature',
    };
    waiver.id = generateId('LW');
    return insertRow('lien_waivers', waiver);
  },
};

// ── RFIs ────────────────────────────────────────────────────
export const rfiService = {
  async list() {
    return fetchAll('rfis', { order: { column: 'date_submitted', ascending: false } });
  },
  async create(rfi) {
    if (!rfi.id) rfi.id = rfi.rfi_number || generateId('RFI');
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
    return fetchAll('projects', { order: { column: 'created_at', ascending: false } });
  },
  async getById(id) {
    return fetchById('projects', id);
  },
  async create(project) {
    if (!project.id) project.id = generateId('PRJ');
    return insertRow('projects', project);
  },
  async updateStatus(id, status) {
    return updateRow('projects', id, { status });
  },
};

// ── Clients ──────────────────────────────────────────────────
export const clientService = {
  async list() {
    return fetchAll('clients', { order: { column: 'name', ascending: true } });
  },
  async create(client) {
    if (!client.id) client.id = generateId('CLI');
    return insertRow('clients', client);
  },
};

// ── Contracts ───────────────────────────────────────────────
export const contractService = {
  async list() {
    return fetchAll('contracts', { order: { column: 'created_at', ascending: false } });
  },
  async getById(id) {
    const contract = await fetchById('contracts', id);
    const { data: lineItems } = await supabase
      .from('contract_line_items')
      .select('*')
      .eq('contract_id', id)
      .order('sort_order', { ascending: true });
    contract.lineItems = (lineItems || []).map((li) => ({ description: li.description, amount: parseFloat(li.amount) }));
    return contract;
  },
  async create(contract, lineItems = []) {
    if (!contract.id) contract.id = generateId('CON');
    const { data: conData, error } = await supabase.from('contracts').insert(contract).select().single();
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
    return updateRow('contracts', id, { status, ...extra });
  },
  async update(id, contractRow, lineItems = []) {
    const { error } = await supabase.from('contracts').update(contractRow).eq('id', id);
    if (error) throw error;
    // Replace all line items
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
    await supabase.from('contract_line_items').delete().eq('contract_id', id);
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Estimates ───────────────────────────────────────────────
export const estimateService = {
  async list() {
    return fetchAll('estimates', { order: { column: 'created_at', ascending: false } });
  },
  async getById(id) {
    const est = await fetchById('estimates', id);
    const { data: lineItems } = await supabase
      .from('estimate_line_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: true });
    est.lineItems = lineItems || [];
    return est;
  },
  async create(estimate, lineItems = []) {
    if (!estimate.id) estimate.id = generateId('EST');
    const { data: estData, error } = await supabase.from('estimates').insert(estimate).select().single();
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
    return updateRow('estimates', id, { status });
  },
};
