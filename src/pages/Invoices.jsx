import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, DollarSign, TrendingUp, AlertCircle, FileText, CheckCircle, Clock, Loader2, Database, HardDrive } from 'lucide-react';
import { payApplications as mockPayApps, clients as mockClients, projects as mockProjects } from '../data/mockData';
import { invoiceService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const statusBadge = (status) => {
  const map = {
    Paid: 'badge-green',
    Pending: 'badge-amber',
    Overdue: 'badge-red',
    Draft: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // tracks which invoice id is being acted on

  // Fetch invoices from Supabase with mock fallback
  const { data: invoices, loading, usingMock, refetch } = useSupabase(invoiceService.list, mockPayApps);

  // Normalize fields — works for both Supabase pay_applications and mock payApplications
  const getClientName = (inv) => {
    if (inv.owner_name) return inv.owner_name; // Supabase pay_applications
    if (inv.owner) return inv.owner; // mock payApplications
    const cId = inv.client_id || inv.clientId;
    const found = mockClients.find((c) => c.id === cId);
    return found ? found.company : cId || '—';
  };

  const getProjectName = (inv) => {
    if (inv.project_name) return inv.project_name; // Supabase
    if (inv.projectName) return inv.projectName; // mock
    const pId = inv.project_id || inv.projectId;
    const found = mockProjects.find((p) => p.id === pId);
    return found ? found.name : pId || '—';
  };

  const getAmount = (inv) => inv.current_payment_due || inv.currentPaymentDue || inv.amount || 0;
  const getDueDate = (inv) => inv.period_to || inv.periodTo || inv.due_date || inv.dueDate || '';
  const getPaidDate = (inv) => inv.paid_date || inv.paidDate || '';
  const getInvoiceNumber = (inv) => {
    const appNo = inv.application_no || inv.applicationNo;
    if (appNo) return `INV-${String(appNo).padStart(3, '0')}`;
    return inv.invoice_number || inv.id || '';
  };
  const getStatus = (inv) => inv.status || '';

  // ── Summary calculations from live data ──
  const totalOutstanding = invoices
    .filter((i) => getStatus(i) === 'Pending' || getStatus(i) === 'Overdue')
    .reduce((sum, i) => sum + getAmount(i), 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const paidThisMonth = invoices
    .filter((i) => getStatus(i) === 'Paid' && getPaidDate(i) && getPaidDate(i).startsWith(currentMonth))
    .reduce((sum, i) => sum + getAmount(i), 0);

  const overdueCount = invoices.filter((i) => getStatus(i) === 'Overdue').length;

  // Aging breakdown for outstanding invoices
  const today = new Date();
  const outstandingInvoices = invoices.filter((i) => getStatus(i) === 'Pending' || getStatus(i) === 'Overdue');
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0 };
  outstandingInvoices.forEach((inv) => {
    const due = new Date(getDueDate(inv));
    const daysOverdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    if (daysOverdue <= 30) aging['0-30'] += getAmount(inv);
    else if (daysOverdue <= 60) aging['31-60'] += getAmount(inv);
    else aging['61-90'] += getAmount(inv);
  });
  const agingTotal = aging['0-30'] + aging['31-60'] + aging['61-90'];

  // Project-level outstanding balance: total invoiced for that projectId minus total paid
  const getProjectOutstanding = (inv) => {
    const pId = inv.project_id || inv.projectId;
    if (!pId) return null;
    const projectInvoices = invoices.filter((i) => (i.project_id || i.projectId) === pId);
    const totalInvoiced = projectInvoices.reduce((s, i) => s + getAmount(i), 0);
    const totalPaid = projectInvoices
      .filter((i) => getStatus(i) === 'Paid')
      .reduce((s, i) => s + getAmount(i), 0);
    return totalInvoiced - totalPaid;
  };

  // Filtered invoices
  let filtered = statusFilter === 'All' ? invoices : invoices.filter((i) => getStatus(i) === statusFilter);
  if (outstandingOnly) {
    filtered = filtered.filter((i) => {
      const s = getStatus(i);
      return s === 'Pending' || s === 'Overdue';
    });
  }

  // ── Actions ──
  const handleMarkPaid = async (id) => {
    setActionLoading(id);
    try {
      await invoiceService.markPaid(id);
      await refetch();
    } catch (err) {
      console.error('Failed to mark as paid:', err);
      alert('Failed to mark as paid: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkOverdue = async (id) => {
    setActionLoading(id);
    try {
      await invoiceService.markOverdue(id);
      await refetch();
    } catch (err) {
      console.error('Failed to mark as overdue:', err);
      alert('Failed to mark as overdue: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Determine if a pending invoice is past due
  const isPastDue = (inv) => {
    if (getStatus(inv) !== 'Pending') return false;
    const due = new Date(getDueDate(inv));
    return today > due;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Invoices &amp; Payments</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Track invoices, payments, and outstanding balances
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Mock / Live indicator */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
            background: usingMock ? '#fef3c7' : '#dcfce7',
            color: usingMock ? '#92400e' : '#166534',
            border: `1px solid ${usingMock ? '#fbbf24' : '#22c55e'}`,
          }}>
            {usingMock ? <HardDrive size={12} /> : <Database size={12} />}
            {usingMock ? 'Mock Data' : 'Live'}
          </span>
          <Link to="/invoices/create" className="btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={16} />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b', gap: '0.5rem' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading invoices...</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Total Outstanding */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} style={{ color: '#d97706' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Outstanding</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </div>

            {/* Paid This Month */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Paid This Month</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{formatCurrency(paidThisMonth)}</p>
                </div>
              </div>
            </div>

            {/* Overdue */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={20} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Overdue</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {overdueCount} invoice{overdueCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Aging Summary */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>Aging Summary</p>
              {agingTotal > 0 && (
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '10px', marginBottom: '0.75rem' }}>
                  {aging['0-30'] > 0 && (
                    <div style={{ width: `${(aging['0-30'] / agingTotal) * 100}%`, background: '#facc15' }} title={`0-30 days: ${formatCurrency(aging['0-30'])}`} />
                  )}
                  {aging['31-60'] > 0 && (
                    <div style={{ width: `${(aging['31-60'] / agingTotal) * 100}%`, background: '#f97316' }} title={`31-60 days: ${formatCurrency(aging['31-60'])}`} />
                  )}
                  {aging['61-90'] > 0 && (
                    <div style={{ width: `${(aging['61-90'] / agingTotal) * 100}%`, background: '#ef4444' }} title={`61-90 days: ${formatCurrency(aging['61-90'])}`} />
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#facc15', display: 'inline-block' }} />
                  0-30d
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f97316', display: 'inline-block' }} />
                  31-60d
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444', display: 'inline-block' }} />
                  61-90d
                </span>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              onClick={() => setOutstandingOnly((v) => !v)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '8px',
                border: `1px solid ${outstandingOnly ? '#dc2626' : '#e2e8f0'}`,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: outstandingOnly ? '#dc2626' : '#64748b',
                background: outstandingOnly ? '#fee2e2' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Outstanding Only
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                color: '#1e293b',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          {/* Invoice Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th className="table-header">Invoice ID</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Amount ($)</th>
                  <th className="table-header">Project Outstanding</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const invId = inv.id;
                  const invNumber = getInvoiceNumber(inv);
                  const status = getStatus(inv);
                  const isActing = actionLoading === invId;
                  return (
                    <tr
                      key={invId}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="table-cell">
                        <Link
                          to={`/invoices/${invId}`}
                          style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <FileText size={14} />
                          {invNumber}
                        </Link>
                      </td>
                      <td className="table-cell" style={{ fontWeight: 500, color: '#1e293b' }}>{getClientName(inv)}</td>
                      <td className="table-cell">{getProjectName(inv)}</td>
                      <td className="table-cell" style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(getAmount(inv))}</td>
                      <td className="table-cell">
                        {(() => {
                          const outstanding = getProjectOutstanding(inv);
                          if (outstanding === null) return <span style={{ color: '#94a3b8' }}>—</span>;
                          const color = outstanding <= 0 ? '#16a34a' : outstanding < 200000 ? '#d97706' : '#dc2626';
                          return (
                            <span style={{ fontWeight: 600, color }}>
                              {formatCurrency(outstanding)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="table-cell">
                        {getDueDate(inv) ? new Date(getDueDate(inv)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${statusBadge(status)}`}>{status}</span>
                      </td>
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link
                            to={`/invoices/${invId}`}
                            style={{ color: '#1d4ed8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}
                          >
                            View
                          </Link>
                          {(status === 'Pending' || status === 'Overdue') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkPaid(invId); }}
                              disabled={isActing}
                              style={{
                                background: 'none', border: '1px solid #16a34a', color: '#16a34a',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                              }}
                              title="Mark as Paid"
                            >
                              {isActing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={12} />}
                              Paid
                            </button>
                          )}
                          {isPastDue(inv) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkOverdue(invId); }}
                              disabled={isActing}
                              style={{
                                background: 'none', border: '1px solid #dc2626', color: '#dc2626',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
                              }}
                              title="Mark as Overdue"
                            >
                              {isActing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={12} />}
                              Overdue
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
