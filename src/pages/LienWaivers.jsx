import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, AlertCircle, DollarSign, Eye, Download, Filter } from 'lucide-react';
import { lienWaivers, projects } from '../data/mockData';

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

const formTypeLabel = {
  K2: 'K2 - Conditional Progress',
  K4: 'K4 - Unconditional Progress',
};

export default function LienWaivers() {
  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formTypeFilter, setFormTypeFilter] = useState('All');

  // Summary calculations
  const totalWaivers = lienWaivers.length;
  const pendingSignature = lienWaivers.filter((w) => w.status === 'Pending Signature').length;
  const totalReleased = lienWaivers
    .filter((w) => w.status === 'Signed')
    .reduce((sum, w) => sum + w.checkAmount, 0);

  // Filtered list
  const filtered = lienWaivers.filter((w) => {
    if (projectFilter !== 'All' && w.projectName !== projectFilter) return false;
    if (statusFilter !== 'All' && w.status !== statusFilter) return false;
    if (formTypeFilter !== 'All' && w.formType !== formTypeFilter) return false;
    return true;
  });

  // Unique project names for filter
  const projectNames = [...new Set(lienWaivers.map((w) => w.projectName))];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Lien Waivers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage conditional and unconditional waivers for all projects</p>
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
          <option value="All">All</option>
          <option value="Draft">Draft</option>
          <option value="Pending Signature">Pending Signature</option>
          <option value="Signed">Signed</option>
        </select>
        <select
          className="input-field w-auto"
          value={formTypeFilter}
          onChange={(e) => setFormTypeFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="K2">K2 - Conditional Progress</option>
          <option value="K4">K4 - Unconditional Progress</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 pl-4 font-medium">Waiver ID</th>
                <th className="pb-3 font-medium">Form Type</th>
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Signer Company</th>
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
                  <td className="py-3 text-sm">{formTypeLabel[w.formType]}</td>
                  <td className="py-3 text-sm">{w.projectName}</td>
                  <td className="py-3 text-sm">{w.signerCompany}</td>
                  <td className="py-3 text-sm text-right">{formatCurrency(w.checkAmount)}</td>
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
