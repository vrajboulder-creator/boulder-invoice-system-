import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, HardHat } from 'lucide-react';
import { invoices, clients, projects } from '../data/mockData';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const formatDateShort = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const getContractDate = (issueDateStr) => {
  const d = new Date(issueDateStr);
  d.setDate(d.getDate() - 30);
  return formatDateShort(d.toISOString());
};

const extractNumber = (id) => {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : id;
};

/* ---- shared styles ---- */
const cellBorder = { border: '1px solid #999', padding: '6px 10px', fontSize: '0.8rem', verticalAlign: 'top' };
const cellBorderBold = { ...cellBorder, fontWeight: 700 };
const labelStyle = { fontWeight: 700, fontSize: '0.7rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.03em' };
const valStyle = { fontSize: '0.8rem', color: '#1e293b' };
const outerBorder = { border: '2px solid #000' };
const thinBorder = { border: '1px solid #bbb' };

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{
      width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <HardHat size={28} style={{ color: '#fff' }} />
    </div>
    <div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, letterSpacing: '0.05em' }}>BOULDER</div>
      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#d97706', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Construction</div>
    </div>
  </div>
);

export default function InvoiceDetail() {
  const { id } = useParams();
  const invoice = invoices.find((i) => i.id === id);

  if (!invoice) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <Link to="/invoices" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Invoice not found.</p>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === invoice.clientId);
  const project = projects.find((p) => p.id === invoice.projectId);
  const appNum = extractNumber(invoice.id);
  const retainageRate = 0.025; // 2.5%

  /* ---- Calculations ---- */
  const lineItemsTotal = invoice.lineItems.reduce((s, li) => s + li.total, 0);
  const originalContractSum = project ? project.budget : lineItemsTotal;
  const contractSumToDate = originalContractSum; // no change orders applied
  const totalCompletedStored = project ? project.spent : lineItemsTotal;
  const retainageCompleted = totalCompletedStored * retainageRate;
  const retainageStored = 0;
  const totalRetainage = retainageCompleted + retainageStored;
  const totalEarnedLessRetainage = totalCompletedStored - totalRetainage;
  const currentPaymentDue = invoice.amount;
  const previousApplications = totalEarnedLessRetainage - currentPaymentDue;
  const balanceToFinish = contractSumToDate - totalEarnedLessRetainage;

  const statusColor = invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Overdue' ? '#dc2626' : '#d97706';
  const statusBg = invoice.status === 'Paid' ? '#dcfce7' : invoice.status === 'Overdue' ? '#fef2f2' : '#fffbeb';

  /* ---- Page wrapper style ---- */
  const pageStyle = {
    maxWidth: 1000, margin: '0 auto', background: '#fff', padding: '36px 44px',
    border: '1px solid #ddd', marginBottom: 24, position: 'relative', fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div style={{ padding: '1.5rem', background: '#f1f5f9', minHeight: '100vh' }}>

      {/* ---- ACTION BAR (hidden on print) ---- */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', maxWidth: 1000, margin: '0 auto 1rem' }}>
        <Link to="/invoices" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700,
            color: statusColor, background: statusBg, border: `1px solid ${statusColor}`,
          }}>
            {invoice.status}
          </span>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
            <Printer size={16} /> Print
          </button>
          <button onClick={() => alert('PDF download is a placeholder.')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* ==================================================================
          PAGE 1 — APPLICATION FOR PAYMENT
          ================================================================== */}
      <div style={pageStyle}>

        {/* PAID watermark */}
        {invoice.status === 'Paid' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)',
            fontSize: '8rem', fontWeight: 900, color: 'rgba(22,163,74,0.07)', pointerEvents: 'none',
            letterSpacing: '0.1em', zIndex: 0, userSelect: 'none',
          }}>PAID</div>
        )}

        {/* TOP: Logo + Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <Logo />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Application for Payment #{appNum}</div>
          </div>
        </div>

        {/* INFO GRID — 3 columns */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, ...outerBorder }}>
          <tbody>
            <tr>
              <td style={{ ...cellBorder, width: '36%', ...outerBorder }} rowSpan={3}>
                <div style={labelStyle}>Submitted To:</div>
                <div style={valStyle}>{client ? client.company : invoice.client}</div>
                <div style={{ ...valStyle, fontSize: '0.75rem', color: '#475569' }}>{client ? client.address : ''}</div>
              </td>
              <td style={{ ...cellBorder, width: '36%', ...outerBorder }} rowSpan={3}>
                <div style={labelStyle}>Contractor:</div>
                <div style={valStyle}>Boulder Construction</div>
                <div style={{ ...valStyle, fontSize: '0.75rem', color: '#475569' }}>123 Commerce Way</div>
                <div style={{ ...valStyle, fontSize: '0.75rem', color: '#475569' }}>Newark, NJ 07102</div>
              </td>
              <td style={{ ...cellBorder, ...outerBorder }}>
                <span style={labelStyle}>Period To: </span><span style={valStyle}>{formatDateShort(invoice.issueDate)}</span>
              </td>
            </tr>
            <tr>
              <td style={{ ...cellBorder, ...outerBorder }}>
                <span style={labelStyle}>Payment Due: </span><span style={valStyle}>{formatDateShort(invoice.dueDate)}</span>
              </td>
            </tr>
            <tr>
              <td style={{ ...cellBorder, ...outerBorder }}>
                <span style={labelStyle}>Contract Date: </span><span style={valStyle}>{getContractDate(invoice.issueDate)}</span>
              </td>
            </tr>
            <tr>
              <td style={{ ...cellBorder, ...outerBorder }}>
                <span style={labelStyle}>Job: </span>
              </td>
              <td style={{ ...cellBorder, ...outerBorder }}>
                <span style={valStyle}>{project ? project.name : invoice.project}</span>
              </td>
              <td style={{ ...cellBorder, ...outerBorder }}>
                <span style={labelStyle}>Contract #: </span><span style={valStyle}>{appNum}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* TWO-COLUMN SECTION: Lines 1-9 (left) + Certification (right) */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>

          {/* LEFT — Lines 1-9 */}
          <div style={{ width: '55%', ...outerBorder, borderRight: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { num: '1.', label: 'ORIGINAL CONTRACT SUM:', val: formatCurrency(originalContractSum), bold: true },
                  { num: '2.', label: 'Net Change by Change Orders:', val: formatCurrency(0) },
                  { num: '3.', label: 'Contract Sum to Date (1+2):', val: formatCurrency(contractSumToDate) },
                  { num: '4.', label: <>Total Completed and Stored To Date<br /><span style={{ fontSize: '0.7rem', color: '#666' }}>(Column G on Page 2):</span></>, val: formatCurrency(totalCompletedStored) },
                  { num: '5.', label: 'Retainage:', val: '', sub: true },
                  { num: '', label: <>&nbsp;&nbsp;a.&nbsp;&nbsp;2.5% of Completed Work:</>, val: formatCurrency(retainageCompleted), indent: true },
                  { num: '', label: <>&nbsp;&nbsp;b.&nbsp;&nbsp;0% of Stored Materials:</>, val: formatCurrency(0), indent: true },
                  { num: '6.', label: 'Total Earned Less Retainage (4-5):', val: formatCurrency(totalEarnedLessRetainage) },
                  { num: '7.', label: 'LESS Previous Applications for Payment:', val: formatCurrency(Math.max(previousApplications, 0)) },
                  { num: '8.', label: 'Current Payment Due:', val: formatCurrency(currentPaymentDue), highlight: true },
                  { num: '9.', label: <>Balance to Finish, Including Retainage<br /><span style={{ fontSize: '0.7rem', color: '#666' }}>(3-6):</span></>, val: formatCurrency(balanceToFinish) },
                ].map((row, i) => (
                  <tr key={i} style={row.highlight ? { background: '#fffbeb' } : {}}>
                    <td style={{
                      padding: '5px 8px', fontSize: '0.78rem', color: '#1e293b',
                      borderBottom: row.highlight ? '3px solid #d97706' : '1px solid #ddd',
                      borderTop: row.highlight ? '3px solid #d97706' : 'none',
                      fontWeight: row.bold || row.highlight ? 700 : 400, width: '70%',
                    }}>
                      {row.num && <span style={{ display: 'inline-block', width: 22, fontWeight: 600 }}>{row.num}</span>}
                      {row.label}
                    </td>
                    <td style={{
                      padding: '5px 8px', fontSize: '0.78rem', textAlign: 'right', color: '#0f172a',
                      borderBottom: row.highlight ? '3px solid #d97706' : '1px solid #ddd',
                      borderTop: row.highlight ? '3px solid #d97706' : 'none',
                      fontWeight: row.bold || row.highlight ? 700 : 400,
                    }}>
                      {row.val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RIGHT — Certification */}
          <div style={{ width: '45%', ...outerBorder, padding: '12px 14px', fontSize: '0.72rem', lineHeight: 1.5, color: '#334155' }}>
            <p style={{ margin: '0 0 10px' }}>
              The undersigned Contractor certifies that to the best of the Contractor's knowledge, information,
              and belief, the Work covered by this Application for Payment has been completed in accordance with
              the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous
              Applications for Payment were issued and payments received, and that current payment shown herein is now due.
            </p>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Contractor:</span> Boulder Construction
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div><span style={{ fontWeight: 600 }}>By:</span> Mike Thornton</div>
              <div><span style={{ fontWeight: 600 }}>Date:</span> {formatDateShort(invoice.issueDate)}</div>
            </div>
            <div style={{ borderBottom: '1px solid #000', marginBottom: 14 }}>&nbsp;</div>

            <div style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.6 }}>
              <div style={{ marginBottom: 4 }}>State of ___________________ &nbsp; County of ___________________</div>
              <div style={{ marginBottom: 4 }}>Subscribed and sworn to me this _____ day of _______________</div>
              <div style={{ marginBottom: 4 }}>Notary Public: ___________________</div>
              <div>My Commission Expires:</div>
            </div>
          </div>
        </div>

        {/* BOTTOM TWO-COLUMN: Change Order Summary + Certificate for Payment */}
        <div style={{ display: 'flex', gap: 0 }}>

          {/* LEFT — Change Order Summary */}
          <div style={{ width: '45%', ...outerBorder, borderRight: 'none', padding: 0 }}>
            <div style={{ background: '#f8fafc', padding: '6px 10px', borderBottom: '1px solid #999', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Change Order Summary
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th style={{ ...cellBorder, borderLeft: 'none', borderRight: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.68rem' }}>&nbsp;</th>
                  <th style={{ ...cellBorder, borderLeft: 'none', borderRight: 'none', textAlign: 'right', fontWeight: 600, fontSize: '0.68rem' }}>Additions</th>
                  <th style={{ ...cellBorder, borderLeft: 'none', borderRight: 'none', textAlign: 'right', fontWeight: 600, fontSize: '0.68rem' }}>Deductions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd' }}>Changes Approved in Previous Periods:</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>$0.00</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>$0.00</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd' }}>Changes Approved This Period:</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>$0.00</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>$0.00</td>
                </tr>
                <tr style={{ fontWeight: 600 }}>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #999' }}>Totals:</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #999', textAlign: 'right' }}>$0.00</td>
                  <td style={{ padding: '4px 10px', borderBottom: '1px solid #999', textAlign: 'right' }}>$0.00</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
              Net Changes by Change Order: <span style={{ float: 'right' }}>$0.00</span>
            </div>
          </div>

          {/* RIGHT — Certificate for Payment */}
          <div style={{ width: '55%', ...outerBorder, padding: 0 }}>
            <div style={{ background: '#f8fafc', padding: '6px 10px', borderBottom: '1px solid #999', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Certificate for Payment
            </div>
            <div style={{ padding: '10px 14px', fontSize: '0.7rem', lineHeight: 1.55, color: '#334155' }}>
              <p style={{ margin: '0 0 10px' }}>
                In accordance with the Contract Documents, based on on-site observations and the data
                comprising the above application, the Construction Manager certifies that to the best of his
                knowledge, information, and belief the Work has progressed as indicated, the quality of the
                Work is in accordance with the Contract Documents, and the Contractor is entitled to
                payment of the AMOUNT CERTIFIED.
              </p>
              <div style={{ marginBottom: 12, fontWeight: 600 }}>
                Amount Certified: $___________________
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Construction Manager:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>By:_________________________</span>
                  <span>Date: _______________</span>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Architect:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>By:_________________________</span>
                  <span>Date: _______________</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================
          PAGE 2 — CONTINUATION SHEET
          ================================================================== */}
      <div style={{ ...pageStyle, pageBreakBefore: 'always' }}>

        {/* TOP: Logo + Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <Logo />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Application for Payment #{appNum}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '10px 0 20px', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0f172a' }}>
          Continuation Sheet
        </div>

        {/* CONTINUATION TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...outerBorder, fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '4%' }}>A</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '22%' }}>B</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>C</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }} colSpan={1}>D</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>E</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '9%' }}>F</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '11%' }}>G</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '5%' }}>%</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '10%' }}>H</th>
                <th style={{ ...cellBorderBold, textAlign: 'center', width: '9%' }}>I</th>
              </tr>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Item</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Description of Work</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Scheduled Value</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Work Completed Previously</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>This Period</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Materials Stored</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Total Completed & Stored</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>%</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Balance to Finish</th>
                <th style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontSize: '0.65rem' }}>Retainage</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, idx) => {
                const scheduledValue = item.total;
                const thisPeriod = item.total;
                const previously = 0;
                const materialsStored = 0;
                const totalCompleted = previously + thisPeriod + materialsStored;
                const pct = scheduledValue > 0 ? ((totalCompleted / scheduledValue) * 100) : 0;
                const balFinish = scheduledValue - totalCompleted;
                const retainage = totalCompleted * retainageRate;
                return (
                  <tr key={idx}>
                    <td style={{ ...cellBorder, textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ ...cellBorder }}>{item.description}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(scheduledValue)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(previously)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(thisPeriod)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(materialsStored)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(totalCompleted)}</td>
                    <td style={{ ...cellBorder, textAlign: 'center' }}>{pct.toFixed(2)}%</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(balFinish)}</td>
                    <td style={{ ...cellBorder, textAlign: 'right' }}>{formatCurrency(retainage)}</td>
                  </tr>
                );
              })}

              {/* Change Orders row */}
              <tr>
                <td style={{ ...cellBorder, textAlign: 'center', fontWeight: 600, fontStyle: 'italic', color: '#64748b' }} colSpan={2}>
                  Change Orders
                </td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
                <td style={{ ...cellBorder, textAlign: 'center', color: '#64748b' }}>—</td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
                <td style={{ ...cellBorder, textAlign: 'right', color: '#64748b' }}>$0.00</td>
              </tr>

              {/* GRAND TOTALS */}
              {(() => {
                const gtScheduled = invoice.lineItems.reduce((s, li) => s + li.total, 0);
                const gtThisPeriod = gtScheduled;
                const gtPreviously = 0;
                const gtMaterials = 0;
                const gtTotalCompleted = gtPreviously + gtThisPeriod + gtMaterials;
                const gtPct = gtScheduled > 0 ? ((gtTotalCompleted / gtScheduled) * 100) : 0;
                const gtBalance = gtScheduled - gtTotalCompleted;
                const gtRetainage = gtTotalCompleted * retainageRate;
                return (
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td style={{ ...cellBorderBold, textAlign: 'center' }} colSpan={2}>GRAND TOTALS</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtScheduled)}</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtPreviously)}</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtThisPeriod)}</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtMaterials)}</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtTotalCompleted)}</td>
                    <td style={{ ...cellBorderBold, textAlign: 'center' }}>{gtPct.toFixed(2)}%</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtBalance)}</td>
                    <td style={{ ...cellBorderBold, textAlign: 'right' }}>{formatCurrency(gtRetainage)}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Print styles ---- */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0; padding: 0; }
        }
      `}</style>
    </div>
  );
}
