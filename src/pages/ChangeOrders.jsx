import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { changeOrders, rfis, projects } from '../data/mockData';

const fmt = (v) => {
  if (v == null) return '$0.00';
  const n = Number(v);
  if (n < 0) return '($' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtShort = (v) => {
  if (v == null) return '$0';
  const n = Number(v);
  if (n < 0) return '($' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ')';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const coStatusBadge = {
  Approved: 'badge-green',
  Pending: 'badge-amber',
  'Under Review': 'badge-blue',
  Rejected: 'badge-red',
};

const rfiStatusBadge = {
  Open: 'badge-amber',
  Responded: 'badge-green',
  Closed: 'badge-gray',
};

/* ── Shared cell styles for the printable CO detail ── */
const cell = { border: '1px solid #999', padding: '5px 8px', fontSize: '0.78rem', verticalAlign: 'top' };
const cellR = { ...cell, textAlign: 'right' };
const cellBold = { ...cell, fontWeight: 700 };
const cellRBold = { ...cellR, fontWeight: 700 };
const hdrCell = { ...cell, background: '#2d5f2d', color: '#fff', fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', textTransform: 'uppercase' };


export default function ChangeOrders() {
  const [activeTab, setActiveTab] = useState('changeOrders');
  const [expandedRow, setExpandedRow] = useState(null);
  const [printCO, setPrintCO] = useState(null); // When set, show printable CO detail

  const toggleRow = (id) => setExpandedRow(expandedRow === id ? null : id);

  /* ── Printable Change Order Detail (Knowify/AIA style) ── */
  if (printCO) {
    const co = changeOrders.find(c => c.id === printCO);
    if (!co) { setPrintCO(null); return null; }
    const proj = projects.find(p => p.id === co.projectId);
    const latestVersion = co.versions[co.versions.length - 1];

    return (
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Action bar */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setPrintCO(null)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to List
          </button>
          <button onClick={() => window.print()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={16} /> Print
          </button>
          <span className={`badge ${coStatusBadge[co.status] || 'badge-gray'}`}>{co.status}</span>
        </div>

        {/* ── PAGE: Change Order Document ── */}
        <div style={{ background: '#fff', border: '2px solid #000', padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {/* Header bar */}
          <div style={{ background: '#0f172a', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.03em' }}>CHANGE ORDER</span>
            <span style={{ fontStyle: 'italic', fontSize: '0.8rem', opacity: 0.8 }}>AIA DOCUMENT G701</span>
          </div>

          {/* Info grid */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ ...cell, width: '35%' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Owner:</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{proj?.client || 'N/A'}</div>
                </td>
                <td style={{ ...cell, width: '35%' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Contractor:</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Boulder Construction</div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>123 Commerce Way, Newark, NJ 07102</div>
                </td>
                <td style={{ ...cell, width: '30%' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Change Order Number:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{co.id}</div>
                </td>
              </tr>
              <tr>
                <td style={cell}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Project:</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{co.project}</div>
                </td>
                <td style={cell}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Job:</div>
                  <div style={{ fontSize: '0.8rem' }}>{proj?.description || co.project}</div>
                </td>
                <td style={cell}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 2 }}>Date:</div>
                  <div style={{ fontSize: '0.8rem' }}>{co.date}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Description & Details */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid #999' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Description of Change:</div>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{co.description}</div>
          </div>

          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Requested By:</div>
            <div style={{ fontSize: '0.85rem' }}>{co.requestedBy}</div>
          </div>

          {/* ── Continuation Sheet style line items table ── */}
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#333', marginBottom: 8, borderBottom: '2px solid #333', paddingBottom: 4 }}>
              Schedule of Values — Change Order Items
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...hdrCell, width: '6%' }}>A<br /><span style={{ fontWeight: 400, fontSize: '0.6rem' }}>Item</span></th>
                  <th style={{ ...hdrCell, width: '34%', textAlign: 'left' }}>B<br /><span style={{ fontWeight: 400, fontSize: '0.6rem' }}>Description of Work</span></th>
                  <th style={{ ...hdrCell, width: '15%' }}>C<br /><span style={{ fontWeight: 400, fontSize: '0.6rem' }}>Scheduled Value</span></th>
                  <th style={{ ...hdrCell, width: '15%' }}>D<br /><span style={{ fontWeight: 400, fontSize: '0.6rem' }}>Previously Approved</span></th>
                  <th style={{ ...hdrCell, width: '15%' }}>E<br /><span style={{ fontWeight: 400, fontSize: '0.6rem' }}>This Period</span></th>
                  <th style={{ ...hdrCell, width: '15%' }}>F<br /><span style={{ fontWeight: 400, fontSize: '0.6rem' }}>Total to Date</span></th>
                </tr>
              </thead>
              <tbody>
                {/* Show version history as line items */}
                {co.versions.map((v, i) => {
                  const isLatest = i === co.versions.length - 1;
                  const prev = i > 0 ? co.versions[i - 1].amount : 0;
                  const delta = v.amount - prev;
                  return (
                    <tr key={v.version} style={{ background: isLatest ? '#fefce8' : '#fff' }}>
                      <td style={{ ...cell, textAlign: 'center', fontWeight: 600 }}>{v.version}</td>
                      <td style={cell}>
                        <div style={{ fontWeight: isLatest ? 600 : 400 }}>
                          {i === 0 ? co.description : `Revision ${v.version}: ${v.notes}`}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>{v.notes}</div>
                      </td>
                      <td style={cellR}>{fmt(v.amount)}</td>
                      <td style={cellR}>{i === 0 ? '$0.00' : fmt(prev)}</td>
                      <td style={{ ...cellR, fontWeight: 600 }}>{i === 0 ? fmt(v.amount) : fmt(delta)}</td>
                      <td style={{ ...cellR, fontWeight: 600 }}>{fmt(v.amount)}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{ background: '#f1f5f9' }}>
                  <td style={cellBold} colSpan={2}>TOTAL CHANGE ORDER AMOUNT</td>
                  <td style={cellRBold}>{fmt(latestVersion.amount)}</td>
                  <td style={cellRBold}></td>
                  <td style={cellRBold}></td>
                  <td style={{ ...cellRBold, fontSize: '0.9rem' }}>{fmt(latestVersion.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Contract adjustment summary */}
          <div style={{ padding: '0 20px 20px' }}>
            <table style={{ width: '60%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ ...cell, fontWeight: 600, width: '70%' }}>The original Contract Sum was:</td>
                  <td style={cellR}>{fmt(proj?.budget || 0)}</td>
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: 600 }}>Net change by previously authorized Change Orders:</td>
                  <td style={cellR}>{fmt(0)}</td>
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: 600 }}>The Contract Sum prior to this Change Order was:</td>
                  <td style={cellR}>{fmt(proj?.budget || 0)}</td>
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: 700 }}>The Contract Sum will be {latestVersion.amount >= 0 ? 'increased' : 'decreased'} by this Change Order in the amount of:</td>
                  <td style={{ ...cellR, fontWeight: 700, color: latestVersion.amount >= 0 ? '#047857' : '#b91c1c' }}>{fmt(latestVersion.amount)}</td>
                </tr>
                <tr style={{ background: '#fefce8' }}>
                  <td style={{ ...cell, fontWeight: 800, fontSize: '0.85rem' }}>The new Contract Sum including this Change Order will be:</td>
                  <td style={{ ...cellR, fontWeight: 800, fontSize: '0.85rem' }}>{fmt((proj?.budget || 0) + latestVersion.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature block */}
          <div style={{ borderTop: '2px solid #000', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 12 }}>OWNER:</div>
              <div style={{ borderBottom: '1px solid #000', height: 30, marginBottom: 4 }}></div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>Signature / Date</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 12 }}>CONTRACTOR:</div>
              <div style={{ borderBottom: '1px solid #000', height: 30, marginBottom: 4 }}></div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>Signature / Date</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 12 }}>ARCHITECT:</div>
              <div style={{ borderBottom: '1px solid #000', height: 30, marginBottom: 4 }}></div>
              <div style={{ fontSize: '0.65rem', color: '#666' }}>Signature / Date</div>
            </div>
          </div>
        </div>

        <style>{`@media print { .no-print { display: none !important; } }`}</style>
      </div>
    );
  }

  /* ── Normal list view ── */
  return (
    <div>
      {/* Page title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Change Orders & RFIs</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>Manage change orders, revisions, and RFIs across all projects</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Total COs</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{changeOrders.length}</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} style={{ color: '#047857' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Approved</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{changeOrders.filter(c => c.status === 'Approved').length}</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} style={{ color: '#d97706' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Total CO Value</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{fmtShort(changeOrders.reduce((s, c) => s + c.amount, 0))}</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={20} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Open RFIs</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{rfis.filter(r => r.status === 'Open').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <button
          style={{
            padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
            background: activeTab === 'changeOrders' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'changeOrders' ? '#fff' : '#475569',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onClick={() => { setActiveTab('changeOrders'); setExpandedRow(null); }}
        >
          <FileText size={16} />
          Change Orders
        </button>
        <button
          style={{
            padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
            background: activeTab === 'rfis' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'rfis' ? '#fff' : '#475569',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onClick={() => { setActiveTab('rfis'); setExpandedRow(null); }}
        >
          <MessageSquare size={16} />
          RFIs
        </button>
      </div>

      {/* ── Change Orders Tab ── */}
      {activeTab === 'changeOrders' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Link to="/change-orders/create" className="btn-primary" style={{ textDecoration: 'none' }}>
              <Plus size={16} /> New Change Order
            </Link>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', width: 30 }}></th>
                  <th className="table-header">CO ID</th>
                  <th className="table-header">Project</th>
                  <th className="table-header" style={{ maxWidth: 250 }}>Description</th>
                  <th className="table-header" style={{ textAlign: 'right' }}>Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => (
                  <React.Fragment key={co.id}>
                    <tr
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => toggleRow(co.id)}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                        {expandedRow === co.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="table-cell" style={{ fontWeight: 600 }}>{co.id}</td>
                      <td className="table-cell">{co.project}</td>
                      <td className="table-cell" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.description}</td>
                      <td className="table-cell" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtShort(co.amount)}</td>
                      <td className="table-cell"><span className={`badge ${coStatusBadge[co.status] || 'badge-gray'}`}>{co.status}</span></td>
                      <td className="table-cell" style={{ color: '#64748b' }}>{co.date}</td>
                      <td className="table-cell" style={{ textAlign: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPrintCO(co.id); }}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff',
                            fontSize: '0.75rem', fontWeight: 600, color: '#475569', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <FileText size={13} /> View
                        </button>
                      </td>
                    </tr>

                    {/* Expanded version history */}
                    {expandedRow === co.id && (
                      <tr>
                        <td colSpan={8} style={{ background: '#f8fafc', padding: '12px 20px' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Version History</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ ...cell, background: '#e2e8f0', fontSize: '0.7rem', fontWeight: 600, width: '10%' }}>Version</th>
                                <th style={{ ...cell, background: '#e2e8f0', fontSize: '0.7rem', fontWeight: 600, width: '15%' }}>Date</th>
                                <th style={{ ...cell, background: '#e2e8f0', fontSize: '0.7rem', fontWeight: 600, width: '15%', textAlign: 'right' }}>Amount</th>
                                <th style={{ ...cell, background: '#e2e8f0', fontSize: '0.7rem', fontWeight: 600 }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {co.versions.map((v) => (
                                <tr key={v.version}>
                                  <td style={{ ...cell, fontWeight: 600, textAlign: 'center' }}>v{v.version}</td>
                                  <td style={cell}>{v.date}</td>
                                  <td style={cellR}>{fmtShort(v.amount)}</td>
                                  <td style={cell}>{v.notes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── RFIs Tab ── */}
      {activeTab === 'rfis' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Link to="/rfis/create" className="btn-primary" style={{ textDecoration: 'none' }}>
              <Plus size={16} /> New RFI
            </Link>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', width: 30 }}></th>
                  <th className="table-header">RFI ID</th>
                  <th className="table-header">Project</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Submitted</th>
                  <th className="table-header">Responded</th>
                  <th className="table-header">By</th>
                </tr>
              </thead>
              <tbody>
                {rfis.map((rfi) => (
                  <React.Fragment key={rfi.id}>
                    <tr
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => toggleRow(rfi.id)}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                        {expandedRow === rfi.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="table-cell" style={{ fontWeight: 600 }}>{rfi.id}</td>
                      <td className="table-cell">{rfi.project}</td>
                      <td className="table-cell" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rfi.subject}</td>
                      <td className="table-cell"><span className={`badge ${rfiStatusBadge[rfi.status] || 'badge-gray'}`}>{rfi.status}</span></td>
                      <td className="table-cell" style={{ color: '#64748b' }}>{rfi.dateSubmitted}</td>
                      <td className="table-cell" style={{ color: '#64748b' }}>{rfi.dateResponded || '—'}</td>
                      <td className="table-cell">{rfi.submittedBy}</td>
                    </tr>

                    {expandedRow === rfi.id && (
                      <tr>
                        <td colSpan={8} style={{ background: '#f8fafc', padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <MessageSquare size={16} style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Response</div>
                              <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                                {rfi.response || 'No response yet.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
