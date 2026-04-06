import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Send, FileText, Loader2, Database, HardDrive, DollarSign, Calculator, HardHat } from 'lucide-react';
import { clients as mockClients, projects as mockProjects, invoices as mockInvoices, contracts as mockContracts, changeOrders as mockChangeOrders } from '../data/mockData';
import { invoiceService, clientService, projectService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const todayStr = () => new Date().toISOString().split('T')[0];
const plus30 = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; };
const minus30 = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; };

const emptyLineItem = () => ({ description: '', scheduledValue: 0, previouslyCompleted: 0, thisPeriod: 0, materialsStored: 0 });

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preloadContractId = searchParams.get('contractId');
  const preloadContract = preloadContractId ? mockContracts.find((c) => c.id === preloadContractId) : null;

  // Edit mode — load existing Draft/Rejected invoice
  const editId = searchParams.get('editId');
  const editInvoice = editId ? mockInvoices.find((i) => i.id === editId) : null;

  const { data: clients, usingMock: clientsMock } = useSupabase(clientService.list, mockClients);
  const { data: projectsList, usingMock: projectsMock } = useSupabase(projectService.list, mockProjects);

  const nextInvoiceNumber = useMemo(() => {
    const allNumbers = mockInvoices.map((inv) => {
      const match = (inv.invoice_number || inv.id || '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    return `INV-${String(Math.max(...allNumbers, 10) + 1).padStart(3, '0')}`;
  }, []);

  // How many pay apps already exist for this contract — determines next app number
  const existingAppCount = preloadContractId
    ? mockInvoices.filter((i) => i.contractId === preloadContractId).length
    : 0;

  // Auto-calculate previous payments from prior invoices on the same contract
  const autoPreviousPayments = preloadContractId
    ? mockInvoices.filter((i) => i.contractId === preloadContractId).reduce((sum, i) => sum + (i.amount || 0), 0)
    : 0;

  // Pre-populate SOV line items — from edit invoice, contract, or blank
  const initialLineItems = (() => {
    // Edit mode: restore existing line items
    if (editInvoice?.lineItems?.length) {
      return editInvoice.lineItems.map((li) => ({
        description: li.description,
        scheduledValue: li.scheduledValue ?? li.scheduled_value ?? 0,
        previouslyCompleted: li.previousApplication ?? li.previously_completed ?? 0,
        thisPeriod: li.thisPeriod ?? li.this_period ?? 0,
        materialsStored: li.materialsStored ?? li.materials_stored ?? 0,
      }));
    }
    if (!preloadContract) return [emptyLineItem()];
    const priorInvoices = mockInvoices.filter((i) => i.contractId === preloadContractId);
    return preloadContract.lineItems.map((li, idx) => {
      const previouslyCompleted = priorInvoices.reduce((sum, inv) => {
        const match = (inv.lineItems || []).find((a) => a.itemNo === idx + 1 || a.description === li.description);
        return sum + (match ? (match.thisPeriod || 0) : 0);
      }, 0);
      return { description: li.description, scheduledValue: li.amount, previouslyCompleted, thisPeriod: 0, materialsStored: 0 };
    });
  })();

  // ── Invoice Header ──
  const [invoiceNumber, setInvoiceNumber] = useState(editInvoice?.id || nextInvoiceNumber);
  const [issueDate, setIssueDate] = useState(editInvoice?.issueDate || editInvoice?.issue_date || todayStr());
  const [periodTo, setPeriodTo] = useState(editInvoice?.periodTo || editInvoice?.period_to || todayStr());
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate || editInvoice?.due_date || plus30());
  const [paymentTerms, setPaymentTerms] = useState(editInvoice?.terms || 'Net 30');
  const [contractDate, setContractDate] = useState(editInvoice?.contractDate || editInvoice?.contract_date || preloadContract?.startDate || minus30());

  // ── Client & Project ──
  const [clientId, setClientId] = useState(editInvoice?.clientId || editInvoice?.client_id || preloadContract?.clientId || '');
  const [projectId, setProjectId] = useState(editInvoice?.projectId || editInvoice?.project_id || preloadContract?.projectId || '');

  // ── Distribution & Subcontractor ──
  const [distributionOwner, setDistributionOwner] = useState(editInvoice?.distribution_owner ?? true);
  const [distributionArchitect, setDistributionArchitect] = useState(editInvoice?.distribution_architect ?? false);
  const [distributionContractor, setDistributionContractor] = useState(editInvoice?.distribution_contractor ?? false);
  const [fromSubcontractor, setFromSubcontractor] = useState(editInvoice?.from_subcontractor || editInvoice?.fromSubcontractor || '');
  const [isSubcontractorVersion, setIsSubcontractorVersion] = useState(editInvoice?.is_subcontractor_version ?? false);

  // ── G702 Contract Fields ──
  const [originalContractSum, setOriginalContractSum] = useState(editInvoice?.originalContractSum || editInvoice?.original_contract_sum || preloadContract?.contractValue || '');
  const [netChangeOrders, setNetChangeOrders] = useState(editInvoice?.netChangeOrders || editInvoice?.net_change_orders || 0);
  const [retainagePercent, setRetainagePercent] = useState(editInvoice?.retainagePercent || editInvoice?.retainage_percent || 2.5);
  const [storedMaterialsRetainage, setStoredMaterialsRetainage] = useState(0);
  const [previousPayments, setPreviousPayments] = useState(editInvoice ? (editInvoice.less_previous_certificates || editInvoice.previousPayments || 0) : autoPreviousPayments);

  // ── Change Order Summary (AIA G702 Format) ──
  const [coPrevAdditions, setCoPrevAdditions] = useState(editInvoice?.co_previous_additions || 0);
  const [coPrevDeductions, setCoPrevDeductions] = useState(editInvoice?.co_previous_deductions || 0);
  const [coThisAdditions, setCoThisAdditions] = useState(editInvoice?.co_this_month_additions || 0);
  const [coThisDeductions, setCoThisDeductions] = useState(editInvoice?.co_this_month_deductions || 0);

  // ── G703 Line Items (Schedule of Values) ──
  const [lineItems, setLineItems] = useState(initialLineItems);

  // ── Notes ──
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Derived: selected client/project info ──
  const filteredProjects = clientId ? projectsList.filter(p => (p.clientId || p.client_id) === clientId) : [];

  // Auto-fill contract sum from project budget
  const handleProjectChange = (pid) => {
    setProjectId(pid);
    const proj = projectsList.find(p => p.id === pid);
    if (proj && proj.budget && !originalContractSum) {
      setOriginalContractSum(proj.budget);
    }
  };

  // ── G702 Auto-Calculations ──
  const contractSum = parseFloat(originalContractSum) || 0;
  const changeOrderNet = parseFloat(netChangeOrders) || 0;
  const contractSumToDate = contractSum + changeOrderNet; // Line 3

  // Line items totals for G703
  const lineTotal = (li) => {
    const prev = parseFloat(li.previouslyCompleted) || 0;
    const curr = parseFloat(li.thisPeriod) || 0;
    const stored = parseFloat(li.materialsStored) || 0;
    return prev + curr + stored;
  };
  const lineScheduled = (li) => parseFloat(li.scheduledValue) || 0;
  const lineBalance = (li) => lineScheduled(li) - lineTotal(li);
  const linePercent = (li) => lineScheduled(li) > 0 ? ((lineTotal(li) / lineScheduled(li)) * 100) : 0;
  const lineRetainage = (li) => lineTotal(li) * ((parseFloat(retainagePercent) || 0) / 100);

  const totalScheduledValue = lineItems.reduce((s, li) => s + lineScheduled(li), 0);
  const totalPreviouslyCompleted = lineItems.reduce((s, li) => s + (parseFloat(li.previouslyCompleted) || 0), 0);
  const totalThisPeriod = lineItems.reduce((s, li) => s + (parseFloat(li.thisPeriod) || 0), 0);
  const totalMaterialsStored = lineItems.reduce((s, li) => s + (parseFloat(li.materialsStored) || 0), 0);
  const totalCompletedAndStored = lineItems.reduce((s, li) => s + lineTotal(li), 0); // Line 4
  const totalBalanceToFinish = lineItems.reduce((s, li) => s + lineBalance(li), 0);
  const totalRetainageAmount = lineItems.reduce((s, li) => s + lineRetainage(li), 0);
  const grandTotalPercent = totalScheduledValue > 0 ? ((totalCompletedAndStored / totalScheduledValue) * 100) : 0;

  const retainageOnCompleted = totalCompletedAndStored * ((parseFloat(retainagePercent) || 0) / 100); // Line 5a
  const retainageOnStored = totalMaterialsStored * ((parseFloat(storedMaterialsRetainage) || 0) / 100); // Line 5b
  const totalRetainage = retainageOnCompleted + retainageOnStored; // Line 5 total
  const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage; // Line 6
  const prevPayments = parseFloat(previousPayments) || 0; // Line 7
  const currentPaymentDue = totalEarnedLessRetainage - prevPayments; // Line 8
  const balanceToFinish = contractSumToDate - totalEarnedLessRetainage; // Line 9

  // Change Order summary
  const coTotalAdditions = (parseFloat(coPrevAdditions) || 0) + (parseFloat(coThisAdditions) || 0);
  const coTotalDeductions = (parseFloat(coPrevDeductions) || 0) + (parseFloat(coThisDeductions) || 0);
  const coNetChanges = coTotalAdditions - coTotalDeductions;

  // Line item helpers
  const updateLineItem = (i, field, value) => setLineItems(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: value }; return u; });
  const addLineItem = () => setLineItems(prev => [...prev, emptyLineItem()]);
  const removeLineItem = (i) => { if (lineItems.length > 1) setLineItems(prev => prev.filter((_, idx) => idx !== i)); };

  // Import approved change orders for this project as G703 line items
  const importChangeOrders = () => {
    const pid = projectId || preloadContract?.projectId;
    if (!pid) return;
    const cos = mockChangeOrders.filter((co) => co.projectId === pid && co.status === 'Approved');
    if (!cos.length) { alert('No approved change orders found for this project.'); return; }
    const coItems = cos.map((co) => ({
      description: `${co.id}: ${co.description}`,
      scheduledValue: co.amount,
      previouslyCompleted: 0,
      thisPeriod: co.amount,
      materialsStored: 0,
    }));
    // Remove empty placeholder rows first, then append CO items
    setLineItems(prev => {
      const nonEmpty = prev.filter(li => li.description.trim() || li.scheduledValue);
      return [...nonEmpty, ...coItems];
    });
  };

  // Payment terms → due date
  const handleTermsChange = (terms) => {
    setPaymentTerms(terms);
    const base = issueDate ? new Date(issueDate + 'T00:00:00') : new Date();
    const days = { 'Net 15': 15, 'Net 30': 30, 'Net 45': 45, 'Net 60': 60, 'Due on Receipt': 0 }[terms] || 30;
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().split('T')[0]);
  };

  // ── Save (creates a G702/G703 Pay Application = Invoice) ──
  const handleSave = async (status) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Find client name/address for the G702 header
      const client = clients.find(c => c.id === clientId);
      const project = projectsList.find(p => p.id === projectId);

      const invoiceRow = {
        invoice_number: invoiceNumber,
        client_id: clientId || null,
        client_name: client ? (client.company || client.name) : null,
        client_address: client ? client.address : null,
        project_id: projectId || null,
        project_name: project ? project.name : null,
        amount: currentPaymentDue,
        issue_date: issueDate,
        period_to: periodTo,
        contract_date: contractDate,
        status,
        // Distribution & Subcontractor
        distribution_owner: distributionOwner,
        distribution_architect: distributionArchitect,
        distribution_contractor: distributionContractor,
        from_subcontractor: fromSubcontractor || null,
        is_subcontractor_version: isSubcontractorVersion,
        // G702 fields
        original_contract_sum: contractSum,
        net_change_orders: changeOrderNet,
        retainage_percent: retainagePercent,
        retainage_on_completed: retainageOnCompleted,
        retainage_on_stored: retainageOnStored,
        total_retainage: totalRetainage,
        total_completed_and_stored: totalCompletedAndStored,
        total_earned_less_retainage: totalEarnedLessRetainage,
        previous_payments: prevPayments,
        balance_to_finish: balanceToFinish,
        // Change order summary
        co_previous_additions: parseFloat(coPrevAdditions) || 0,
        co_previous_deductions: parseFloat(coPrevDeductions) || 0,
        co_this_month_additions: parseFloat(coThisAdditions) || 0,
        co_this_month_deductions: parseFloat(coThisDeductions) || 0,
      };

      // G703 line items
      const lineItemRows = lineItems.filter(li => li.description.trim()).map(li => ({
        description: li.description,
        scheduled_value: parseFloat(li.scheduledValue) || 0,
        previously_completed: parseFloat(li.previouslyCompleted) || 0,
        this_period: parseFloat(li.thisPeriod) || 0,
        materials_stored: parseFloat(li.materialsStored) || 0,
        total_completed: lineTotal(li),
        percent_complete: parseFloat(linePercent(li).toFixed(1)),
        balance_to_finish: lineBalance(li),
        retainage: lineRetainage(li),
      }));

      if (editId) {
        // Edit mode — update existing invoice
        await invoiceService.updateStatus(editId, status);
        // Also update the pay app row fields via a generic update
        try {
          const { supabase } = await import('../lib/supabase');
          await supabase.from('pay_applications').update(invoiceRow).eq('id', editId);
          await supabase.from('pay_application_line_items').delete().eq('pay_application_id', editId);
          if (lineItemRows.length > 0) {
            const rows = lineItemRows.map((li, i) => ({ ...li, pay_application_id: editId, item_no: i + 1, sort_order: i }));
            await supabase.from('pay_application_line_items').insert(rows);
          }
        } catch (_) {
          // Mock mode — Supabase not connected, just navigate
        }
        navigate(`/invoices/${editId}`);
      } else {
        await invoiceService.create(invoiceRow, lineItemRows);
        navigate('/invoices');
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const usingMock = clientsMock && projectsMock;
  const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
  const sectionTitle = { fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 };
  const calcRow = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9' };
  const calcLabel = { color: '#475569', fontWeight: 500 };
  const calcValue = { fontWeight: 600, color: '#0f172a', minWidth: 120, textAlign: 'right' };
  const highlightRow = { ...calcRow, background: '#fef9c3', padding: '8px 12px', margin: '4px -12px', borderRadius: 6, borderBottom: '2px solid #f59e0b' };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button onClick={() => navigate('/invoices')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: 8 }}>
            <ArrowLeft size={16} /> Back to Invoices
          </button>
          <h1 className="page-title">{editInvoice ? `Edit Invoice — ${editInvoice.id}` : 'Create Application for Payment'}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
            background: usingMock ? '#fef3c7' : '#dcfce7', color: usingMock ? '#92400e' : '#166534', border: `1px solid ${usingMock ? '#fbbf24' : '#22c55e'}`,
          }}>
            {usingMock ? <HardDrive size={12} /> : <Database size={12} />}
            {usingMock ? 'Mock Data' : 'Live'}
          </span>
          <button className="btn-secondary" onClick={() => handleSave('Draft')} disabled={submitting}>
            {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save Draft
          </button>
          <button className="btn-primary" onClick={() => handleSave('Pending')} disabled={submitting}>
            {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />} Send Invoice
          </button>
        </div>
      </div>

      {/* Edit banner — shown when editing a rejected invoice */}
      {editInvoice && (
        <div style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem', borderRadius: 8, background: editInvoice.status === 'Rejected' ? '#fef2f2' : '#eff6ff', border: `1px solid ${editInvoice.status === 'Rejected' ? '#fca5a5' : '#bfdbfe'}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 700, color: editInvoice.status === 'Rejected' ? '#dc2626' : '#2563eb', fontSize: '0.875rem' }}>
            {editInvoice.status === 'Rejected' ? '⚠ Client rejected this invoice — revise and re-send' : `Editing ${editInvoice.id}`}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 'auto' }}>
            Original status: <strong>{editInvoice.status}</strong>
          </span>
        </div>
      )}

      {/* Contract banner — shown when launched from a contract */}
      {preloadContract && (
        <div style={{ padding: '0.875rem 1.25rem', marginBottom: '1.25rem', borderRadius: 8, background: '#fff5ef', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} style={{ color: '#f07030', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem' }}>Billing against contract:</span>
            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{preloadContract.title}</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ fontWeight: 600 }}>Contract Value:</span> {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(preloadContract.contractValue)}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ fontWeight: 600 }}>Application #:</span> {existingAppCount + 1}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ fontWeight: 600 }}>Type:</span> {preloadContract.type}
            </span>
          </div>
        </div>
      )}

      {submitError && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.875rem' }}>
          {submitError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        {/* ═══ LEFT COLUMN — Form Inputs ═══ */}
        <div>
          {/* ── Invoice Details + Distribution ── */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={sectionTitle}><FileText size={16} /> Invoice Details</div>
            
            {/* Top Row: Distribution Checkboxes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Distribution to:</label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={distributionOwner} onChange={e => setDistributionOwner(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <span>Owner</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={distributionArchitect} onChange={e => setDistributionArchitect(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <span>Architect</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={distributionContractor} onChange={e => setDistributionContractor(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <span>Contractor</span>
                  </label>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Subcontractor Version?</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={isSubcontractorVersion} onChange={e => setIsSubcontractorVersion(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>This is a subcontractor application</span>
                </label>
              </div>
            </div>

            {/* Subcontractor Field (conditional) */}
            {isSubcontractorVersion && (
              <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <label style={labelStyle}>From Subcontractor:</label>
                <input className="input" type="text" placeholder="Subcontractor name..." value={fromSubcontractor} onChange={e => setFromSubcontractor(e.target.value)} />
              </div>
            )}

            {/* Invoice Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '1rem' }}>
              <div><label style={labelStyle}>Invoice Number</label><input className="input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div>
              <div>
                <label style={labelStyle}>Application Date</label>
                <input className="input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2, display: 'block' }}>Date submitted</span>
              </div>
              <div>
                <label style={labelStyle}>Period To</label>
                <input className="input" type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2, display: 'block' }}>End of billing period</span>
              </div>
              <div><label style={labelStyle}>Payment Due</label><input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
              <div><label style={labelStyle}>Contract Date</label><input className="input" type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={labelStyle}>Client (Submitted To)</label>
                <select className="input" value={clientId} onChange={e => { setClientId(e.target.value); setProjectId(''); }} style={{ appearance: 'auto' }}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Project (Job)</label>
                <select className="input" value={projectId} onChange={e => handleProjectChange(e.target.value)} style={{ appearance: 'auto' }} disabled={!clientId}>
                  <option value="">{clientId ? 'Select project...' : 'Select client first'}</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Payment Terms</label>
                <select className="input" value={paymentTerms} onChange={e => handleTermsChange(e.target.value)} style={{ appearance: 'auto' }}>
                  <option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Due on Receipt</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── G702 Contract Summary ── */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={sectionTitle}><DollarSign size={16} /> Contract Summary (G702 Lines 1-9)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>1. Original Contract Sum</label>
                <input className="input" type="number" step="0.01" placeholder="0.00" value={originalContractSum} onChange={e => setOriginalContractSum(e.target.value)} style={{ textAlign: 'right', fontWeight: 600 }} />
              </div>
              <div>
                <label style={labelStyle}>2. Net Change Orders</label>
                <input className="input" type="number" step="0.01" placeholder="0.00" value={netChangeOrders} onChange={e => setNetChangeOrders(e.target.value)} style={{ textAlign: 'right' }} />
              </div>
              <div>
                <label style={labelStyle}>3. Contract Sum to Date (auto)</label>
                <div className="input" style={{ background: '#f8fafc', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(contractSumToDate)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>5a. Retainage % (Completed Work)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="input" type="number" step="0.5" min="0" max="100" value={retainagePercent} onChange={e => setRetainagePercent(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>%</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>5b. Retainage % (Stored Materials)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input className="input" type="number" step="0.5" min="0" max="100" value={storedMaterialsRetainage} onChange={e => setStoredMaterialsRetainage(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>%</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>7. Less Previous Payments</label>
                <input className="input" type="number" step="0.01" placeholder="0.00" value={previousPayments} onChange={e => setPreviousPayments(e.target.value)} style={{ textAlign: 'right' }} />
              </div>
            </div>
          </div>

          {/* ── G703 Schedule of Values (Line Items) ── */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ ...sectionTitle, marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                <Calculator size={16} /> Schedule of Values (G703 Line Items)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(projectId || preloadContract?.projectId) && (
                  <button
                    onClick={importChangeOrders}
                    style={{ background: 'none', border: '1px dashed #f59e0b', color: '#d97706', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, padding: '6px 12px', borderRadius: 6 }}
                    title="Add approved change orders as G703 line items"
                  >
                    <Plus size={14} /> Import COs
                  </button>
                )}
                <button onClick={addLineItem} style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, padding: '6px 12px', borderRadius: 6 }}>
                  <Plus size={14} /> Add Line Item
                </button>
              </div>
            </div>

            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 110px 110px 110px 110px 110px 50px 90px 90px 30px', gap: 4, padding: '6px 0', borderBottom: '2px solid #e2e8f0', marginBottom: 4 }}>
              {['#', 'Description of Work', 'Scheduled Value', 'Previously Completed', 'This Period', 'Materials Stored', 'Total Completed', '%', 'Balance', 'Retainage', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {lineItems.map((li, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 110px 110px 110px 110px 110px 50px 90px 90px 30px', gap: 4, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>{idx + 1}</span>
                <input className="input" type="text" placeholder="Description" value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} style={{ fontSize: '0.8rem', padding: '4px 6px' }} />
                <input className="input" type="number" step="0.01" placeholder="0.00" value={li.scheduledValue || ''} onChange={e => updateLineItem(idx, 'scheduledValue', e.target.value)} style={{ fontSize: '0.8rem', padding: '4px 6px', textAlign: 'right' }} />
                <input className="input" type="number" step="0.01" placeholder="0.00" value={li.previouslyCompleted || ''} onChange={e => updateLineItem(idx, 'previouslyCompleted', e.target.value)} style={{ fontSize: '0.8rem', padding: '4px 6px', textAlign: 'right' }} />
                <input className="input" type="number" step="0.01" placeholder="0.00" value={li.thisPeriod || ''} onChange={e => updateLineItem(idx, 'thisPeriod', e.target.value)} style={{ fontSize: '0.8rem', padding: '4px 6px', textAlign: 'right', background: '#fefce8' }} />
                <input className="input" type="number" step="0.01" placeholder="0.00" value={li.materialsStored || ''} onChange={e => updateLineItem(idx, 'materialsStored', e.target.value)} style={{ fontSize: '0.8rem', padding: '4px 6px', textAlign: 'right' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'right', color: '#0f172a', paddingRight: 4 }}>{fmt(lineTotal(li))}</div>
                <div style={{ fontSize: '0.75rem', textAlign: 'center', color: '#64748b' }}>{linePercent(li).toFixed(0)}%</div>
                <div style={{ fontSize: '0.8rem', textAlign: 'right', color: lineBalance(li) > 0 ? '#d97706' : '#047857', paddingRight: 4 }}>{fmt(lineBalance(li))}</div>
                <div style={{ fontSize: '0.8rem', textAlign: 'right', color: '#64748b', paddingRight: 4 }}>{fmt(lineRetainage(li))}</div>
                <button onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1} style={{ background: 'none', border: 'none', cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer', color: lineItems.length === 1 ? '#e2e8f0' : '#ef4444', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* Grand Totals Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 110px 110px 110px 110px 110px 50px 90px 90px 30px', gap: 4, padding: '8px 0', borderTop: '2px solid #1e293b', marginTop: 4 }}>
              <span></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>GRAND TOTALS</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(totalScheduledValue)}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(totalPreviouslyCompleted)}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(totalThisPeriod)}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(totalMaterialsStored)}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(totalCompletedAndStored)}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', color: '#0f172a' }}>{grandTotalPercent.toFixed(1)}%</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#d97706' }}>{fmt(totalBalanceToFinish)}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>{fmt(totalRetainageAmount)}</span>
              <span></span>
            </div>
          </div>

          {/* ── Change Order Summary (AIA G702 Format) ── */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={sectionTitle}><FileText size={16} /> Change Order Summary (AIA G702)</div>
            
            {/* Input Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div><label style={labelStyle}>Previous Addns.</label><input className="input" type="number" step="0.01" value={coPrevAdditions} onChange={e => setCoPrevAdditions(e.target.value)} style={{ textAlign: 'right' }} /></div>
              <div><label style={labelStyle}>Previous Deductions</label><input className="input" type="number" step="0.01" value={coPrevDeductions} onChange={e => setCoPrevDeductions(e.target.value)} style={{ textAlign: 'right' }} /></div>
              <div><label style={labelStyle}>This Month Addns.</label><input className="input" type="number" step="0.01" value={coThisAdditions} onChange={e => setCoThisAdditions(e.target.value)} style={{ textAlign: 'right' }} /></div>
              <div><label style={labelStyle}>This Month Dedns.</label><input className="input" type="number" step="0.01" value={coThisDeductions} onChange={e => setCoThisDeductions(e.target.value)} style={{ textAlign: 'right' }} /></div>
            </div>

            {/* AIA G702 Change Order Summary Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999' }}>
              <thead>
                <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #999' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #999' }}>Change Order Summary</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #999' }}>Additions</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Deductions</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #999' }}>
                  <td style={{ padding: '6px 12px', fontSize: '0.8rem', borderRight: '1px solid #999' }}>Total changes approved in previous months by Owner</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '0.8rem', borderRight: '1px solid #999' }}>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>{fmt(coPrevAdditions)}</span>
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '0.8rem' }}>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>{fmt(coPrevDeductions)}</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #999' }}>
                  <td style={{ padding: '6px 12px', fontSize: '0.8rem', borderRight: '1px solid #999' }}>Total approved this Month</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '0.8rem', borderRight: '1px solid #999' }}>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>{fmt(coThisAdditions)}</span>
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '0.8rem' }}>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>{fmt(coThisDeductions)}</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '2px solid #999', background: '#fafafa' }}>
                  <td style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, borderRight: '1px solid #999' }}>TOTALS</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, borderRight: '1px solid #999' }}>
                    {fmt(coTotalAdditions)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700 }}>
                    {fmt(coTotalDeductions)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, borderRight: '1px solid #999' }}>NET CHANGES by Change Order</td>
                  <td colSpan="2" style={{ padding: '6px 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: coNetChanges >= 0 ? '#047857' : '#b91c1c' }}>
                    {fmt(coNetChanges)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Notes ── */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Notes / Terms</label>
            <textarea className="input" rows={3} placeholder="Payment instructions, terms..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
          </div>

          {/* ══════════ SAVE BAR (bottom of form) ══════════ */}
          <div className="card" style={{
            padding: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 12, color: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Left: Payment summary */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Current Payment Due
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>
                  {fmt(currentPaymentDue)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                  {lineItems.filter(li => li.description.trim()).length} line item(s) &bull; {grandTotalPercent.toFixed(1)}% complete
                </div>
              </div>

              {/* Right: Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => navigate('/invoices')}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px', borderRadius: 8, border: '1px solid #475569',
                    background: 'transparent', color: '#94a3b8', fontWeight: 600,
                    fontSize: '0.875rem', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave('Draft')}
                  disabled={submitting}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: '1px solid #475569',
                    background: '#334155', color: '#fff', fontWeight: 600,
                    fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave('Pending')}
                  disabled={submitting}
                  style={{
                    padding: '12px 32px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                    fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
                  }}
                >
                  {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  Send Invoice
                </button>
              </div>
            </div>

            {/* Success/error message */}
            {submitError && (
              <div style={{ marginTop: '1rem', padding: '8px 12px', borderRadius: 6, background: '#fef2f2', color: '#991b1b', fontSize: '0.8rem', fontWeight: 500 }}>
                {submitError}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN — Live G702 Summary ═══ */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardHat size={18} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>BOULDER</div>
              <div style={{ fontSize: '0.5rem', fontWeight: 600, color: '#d97706', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Construction</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
              App #{invoiceNumber.replace(/\D/g, '') || '—'}
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            G702 Summary — Live Preview
          </div>

          <div style={calcRow}><span style={calcLabel}>1. Original Contract Sum</span><span style={calcValue}>{fmt(contractSum)}</span></div>
          <div style={calcRow}><span style={calcLabel}>2. Net Change Orders</span><span style={calcValue}>{fmt(changeOrderNet)}</span></div>
          <div style={{ ...calcRow, borderBottom: '2px solid #e2e8f0' }}><span style={{ ...calcLabel, fontWeight: 700 }}>3. Contract Sum to Date</span><span style={{ ...calcValue, fontWeight: 700 }}>{fmt(contractSumToDate)}</span></div>
          <div style={calcRow}><span style={calcLabel}>4. Total Completed & Stored</span><span style={calcValue}>{fmt(totalCompletedAndStored)}</span></div>
          <div style={calcRow}><span style={calcLabel}>&nbsp;&nbsp;a. {retainagePercent}% Completed Work</span><span style={calcValue}>{fmt(retainageOnCompleted)}</span></div>
          <div style={calcRow}><span style={calcLabel}>&nbsp;&nbsp;b. {storedMaterialsRetainage}% Stored Materials</span><span style={calcValue}>{fmt(retainageOnStored)}</span></div>
          <div style={calcRow}><span style={calcLabel}>5. Total Retainage</span><span style={{ ...calcValue, color: '#b91c1c' }}>({fmt(totalRetainage)})</span></div>
          <div style={{ ...calcRow, borderBottom: '2px solid #e2e8f0' }}><span style={{ ...calcLabel, fontWeight: 600 }}>6. Earned Less Retainage</span><span style={{ ...calcValue, fontWeight: 600 }}>{fmt(totalEarnedLessRetainage)}</span></div>
          <div style={calcRow}><span style={calcLabel}>7. Less Previous Payments</span><span style={{ ...calcValue, color: '#b91c1c' }}>({fmt(prevPayments)})</span></div>

          {/* Line 8 — Current Payment Due — HIGHLIGHTED */}
          <div style={highlightRow}>
            <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.875rem' }}>8. Current Payment Due</span>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{fmt(currentPaymentDue)}</span>
          </div>

          <div style={calcRow}><span style={calcLabel}>9. Balance to Finish</span><span style={calcValue}>{fmt(balanceToFinish)}</span></div>

          {/* Quick stats */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#f8fafc', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Line Items</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{lineItems.filter(li => li.description.trim()).length}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>% Complete</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{grandTotalPercent.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {submitting && <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>}
    </div>
  );
}
