import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { invoices, clients, projects } from '../data/mockData';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const statusBadge = (status) => {
  const map = {
    Paid: 'badge-green',
    Pending: 'badge-amber',
    Overdue: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState('All');

  // Summary calculations
  const totalOutstanding = invoices
    .filter((i) => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((sum, i) => sum + i.amount, 0);

  const paidThisMonth = invoices
    .filter((i) => i.status === 'Paid' && i.paidDate && i.paidDate.startsWith('2026-03'))
    .reduce((sum, i) => sum + i.amount, 0);

  const overdueCount = invoices.filter((i) => i.status === 'Overdue').length;

  // Aging breakdown for outstanding invoices
  const today = new Date('2026-04-02');
  const outstandingInvoices = invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue');
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0 };
  outstandingInvoices.forEach((inv) => {
    const due = new Date(inv.dueDate);
    const daysOverdue = Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
    if (daysOverdue <= 30) aging['0-30'] += inv.amount;
    else if (daysOverdue <= 60) aging['31-60'] += inv.amount;
    else aging['61-90'] += inv.amount;
  });
  const agingTotal = aging['0-30'] + aging['31-60'] + aging['61-90'];

  // Filtered invoices
  const filtered = statusFilter === 'All' ? invoices : invoices.filter((i) => i.status === statusFilter);

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
        <Link to="/invoices/create" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} />
          Create Invoice
        </Link>
      </div>

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
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
              <th className="table-header">Due Date</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr
                key={inv.id}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td className="table-cell">
                  <Link
                    to={`/invoices/${inv.id}`}
                    style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <FileText size={14} />
                    {inv.id}
                  </Link>
                </td>
                <td className="table-cell" style={{ fontWeight: 500, color: '#1e293b' }}>{inv.client}</td>
                <td className="table-cell">{inv.project}</td>
                <td className="table-cell" style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(inv.amount)}</td>
                <td className="table-cell">
                  {new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="table-cell">
                  <span className={`badge ${statusBadge(inv.status)}`}>{inv.status}</span>
                </td>
                <td className="table-cell">
                  <Link
                    to={`/invoices/${inv.id}`}
                    style={{ color: '#1d4ed8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
