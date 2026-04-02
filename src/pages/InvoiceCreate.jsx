import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Send, FileText } from 'lucide-react';
import { clients, projects } from '../data/mockData';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const todayStr = () => new Date().toISOString().split('T')[0];
const plus30 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

const emptyLineItem = () => ({ description: '', quantity: 1, unitCost: 0 });

export default function InvoiceCreate() {
  const navigate = useNavigate();

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState('INV-011');
  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(plus30());
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Client & Project
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');

  // Line items
  const [lineItems, setLineItems] = useState([emptyLineItem()]);

  // Tax & notes
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');

  // Filtered projects based on selected client
  const filteredProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : [];

  // Line item helpers
  const updateLineItem = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const lineTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
  const subtotal = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const taxAmount = subtotal * ((parseFloat(taxRate) || 0) / 100);
  const grandTotal = subtotal + taxAmount;

  // Handle payment terms change -> auto-set due date
  const handlePaymentTermsChange = (terms) => {
    setPaymentTerms(terms);
    const base = issueDate ? new Date(issueDate + 'T00:00:00') : new Date();
    let days = 30;
    if (terms === 'Net 15') days = 15;
    else if (terms === 'Net 30') days = 30;
    else if (terms === 'Net 45') days = 45;
    else if (terms === 'Net 60') days = 60;
    else if (terms === 'Due on Receipt') days = 0;
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().split('T')[0]);
  };

  // Handle client change -> reset project
  const handleClientChange = (id) => {
    setClientId(id);
    setProjectId('');
  };

  // Save
  const handleSave = (status) => {
    alert(`Invoice ${invoiceNumber} saved as "${status}". Grand Total: ${formatCurrency(grandTotal)}`);
    navigate('/invoices');
  };

  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' };
  const sectionTitle = { fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button
            onClick={() => navigate('/invoices')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Back to Invoices
          </button>
          <h1 className="page-title">Create Invoice</h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>

        {/* Section 1 — Invoice Details */}
        <div style={sectionTitle}>
          <FileText size={16} /> Invoice Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label style={labelStyle}>Invoice Number</label>
            <input
              className="input"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Issue Date</label>
            <input
              className="input"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Terms</label>
            <select
              className="input"
              value={paymentTerms}
              onChange={(e) => handlePaymentTermsChange(e.target.value)}
              style={{ appearance: 'auto' }}
            >
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </select>
          </div>
        </div>

        {/* Section 2 — Client & Project */}
        <div style={sectionTitle}>
          Client &amp; Project
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <label style={labelStyle}>Client</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              style={{ appearance: 'auto' }}
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Project</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ appearance: 'auto' }}
              disabled={!clientId}
            >
              <option value="">{clientId ? 'Select a project...' : 'Select a client first'}</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3 — Line Items */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ ...sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
              Line Items
            </div>
            <button
              onClick={addLineItem}
              style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '0.375rem', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#d97706'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          {/* Line Items Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 140px 40px', gap: '0.75rem', padding: '0 0 0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qty</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Unit Cost</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total</span>
            <span></span>
          </div>

          {/* Line Item Rows */}
          {lineItems.map((item, idx) => (
            <div
              key={idx}
              style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px 140px 40px', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}
            >
              <input
                className="input"
                type="text"
                placeholder="Description of work"
                value={item.description}
                onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
              />
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                style={{ textAlign: 'center' }}
              />
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={item.unitCost || ''}
                onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)}
                style={{ textAlign: 'right' }}
              />
              <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', paddingRight: '0.25rem' }}>
                {formatCurrency(lineTotal(item))}
              </div>
              <button
                onClick={() => removeLineItem(idx)}
                disabled={lineItems.length === 1}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: lineItems.length === 1 ? 'not-allowed' : 'pointer',
                  color: lineItems.length === 1 ? '#cbd5e1' : '#ef4444',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Remove line item"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Section 4 — Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <div style={{ width: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: '#475569' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', fontSize: '0.875rem', color: '#475569' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Tax Rate
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.25"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{ width: '70px', textAlign: 'center', padding: '0.25rem 0.375rem', fontSize: '0.8125rem' }}
                />
                %
              </span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(taxAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', borderTop: '2px solid #e2e8f0', marginTop: '0.25rem' }}>
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Section 5 — Notes / Terms */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={labelStyle}>Notes / Terms</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Payment instructions, terms, or additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: 'vertical', width: '100%' }}
          />
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>
            Cancel
          </button>
          <button className="btn-secondary" onClick={() => handleSave('Draft')}>
            <Save size={16} /> Save as Draft
          </button>
          <button className="btn-primary" onClick={() => handleSave('Sent')}>
            <Send size={16} /> Send Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
