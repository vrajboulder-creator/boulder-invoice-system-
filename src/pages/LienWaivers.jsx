import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, AlertCircle, DollarSign, Eye, Download, Filter, Loader2 } from 'lucide-react';
import { lienWaiverService } from '../services/supabaseService';
import { useSupabase } from '../hooks/useSupabase';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const statusBadge = (status) => {
  const map = {
    Draft: 'badge-gray',
    'Pending Signature': 'badge-amber',
    Signed: 'badge-green',
  };
  return map[status] || 'badge-gray';
};

/** Normalize a waiver row so both snake_case (Supabase) and camelCase (mock) fields are accessible */
function normalizeWaiver(w) {
  const category = w.waiver_category || w.waiverCategory || 'Partial';
  const condition = w.condition_type || w.conditionType || 'Conditional';
  const waiverAmt = w.waiver_amount ?? w.waiverAmount ?? 0;
  const finalBal = w.final_balance ?? w.finalBalance ?? 0;
  return {
    id: w.id,
    waiverCategory: category,
    conditionType: condition,
    typeLabel: `${category} \u00B7 ${condition}`,
    projectName: w.project_name || w.projectName || '',
    projectId: w.project_id || w.projectId || '',
    signerCompany: w.signer_company || w.signerCompany || '',
    signerName: w.signer_name || w.signerName || '',
    furnisher: w.furnisher || '',
    amount: category === 'Final' ? Number(finalBal) : Number(waiverAmt),
    date: w.waiver_date || w.date || '',
    status: w.status || '',
  };
}

export default function LienWaivers() {
  const { data: rawWaivers, loading } = useSupabase(lienWaiverService.list);

  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  // Normalize all waivers for consistent field access
  const waivers = rawWaivers.map(normalizeWaiver);

  // Summary calculations from live data
  const totalWaivers = waivers.length;
  const pendingSignature = waivers.filter((w) => w.status === 'Pending Signature').length;
  const totalReleased = waivers
    .filter((w) => w.status === 'Signed')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  // Filtered list
  const filtered = waivers.filter((w) => {
    if (projectFilter !== 'All' && w.projectName !== projectFilter) return false;
    if (statusFilter !== 'All' && w.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && w.waiverCategory !== categoryFilter) return false;
    if (outstandingOnly && w.status === 'Signed') return false;
    return true;
  });

  // Unique project names for filter
  const projectNames = [...new Set(waivers.map((w) => w.projectName).filter(Boolean))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500 text-lg">Loading lien waivers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Lien Waivers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage affidavit, release and waiver of lien documents for all projects</p>
        </div>
        <Link to="/lien-waivers/create" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Plus size={16} className="inline mr-1.5 -mt-0.5" />
          Generate Waiver
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Waivers</p>
              <p className="text-2xl font-bold mt-1">{totalWaivers}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Signature</p>
              <p className="text-2xl font-bold mt-1">{pendingSignature}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Released Amount</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalReleased)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <button
          onClick={() => setOutstandingOnly((v) => !v)}
          style={{
            padding: '0.4rem 0.75rem',
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
          className="input-field w-auto"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="All">All Projects</option>
          {projectNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Pending Signature">Pending Signature</option>
          <option value="Signed">Signed</option>
        </select>
        <select
          className="input-field w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Partial">Partial Waiver</option>
          <option value="Final">Final Waiver</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 pl-4 font-medium">Waiver ID</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Furnisher / Company</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 pl-4">
                    <Link to={`/lien-waivers/${w.id}`} className="text-blue-600 font-medium hover:underline">
                      {w.id}
                    </Link>
                  </td>
                  <td className="py-3 text-sm">{w.typeLabel}</td>
                  <td className="py-3 text-sm">{w.projectName}</td>
                  <td className="py-3 text-sm">{w.furnisher || w.signerCompany}</td>
                  <td className="py-3 text-sm text-right">{formatCurrency(w.amount)}</td>
                  <td className="py-3 text-sm">{w.date}</td>
                  <td className="py-3">
                    <span className={`badge ${statusBadge(w.status)}`}>{w.status}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/lien-waivers/${w.id}`}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No waivers match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
