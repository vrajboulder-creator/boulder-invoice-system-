import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle, Clock, Send, DollarSign } from 'lucide-react';
import { payApplications, subPayApplications } from '../data/mockData.js';

/* ── Currency formatting ─────────────────────────────────────── */
const fmt = (v) => {
  if (v == null) return '$0.00';
  const num = Number(v);
  if (num < 0) return '($' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (v) => {
  if (v == null || v === 0) return '0.0%';
  return Number(v).toFixed(1) + '%';
};

const fmtDash = (v) => {
  if (v == null || v === 0) return ' - ';
  return fmt(v);
};

/* ── Handle thisPeriod / thisPeroid (legacy typo) ────────────── */
const getThisPeriod = (li) => li.thisPeriod ?? li.thisPeroid ?? 0;

/* ── Date formatting ─────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

/* ── Status badge config ─────────────────────────────────────── */
const statusConfig = {
  Submitted: { color: '#2563eb', bg: '#dbeafe', icon: Send },
  Approved: { color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  Paid: { color: '#7c3aed', bg: '#ede9fe', icon: DollarSign },
  Draft: { color: '#6b7280', bg: '#f3f4f6', icon: Clock },
  Rejected: { color: '#dc2626', bg: '#fee2e2', icon: Clock },
};

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function PayApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('g702');

  const pa = payApplications.find((p) => p.id === id) || subPayApplications.find((p) => p.id === id);

  if (!pa) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h2>Pay Application Not Found</h2>
        <p>No pay application with ID "{id}" was found.</p>
        <button onClick={() => navigate('/pay-applications')} style={{ marginTop: 16, padding: '8px 20px', cursor: 'pointer', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}>
          Back to Pay Applications
        </button>
      </div>
    );
  }

  const isSub = !!pa.isSubcontractorVersion;
  const sc = statusConfig[pa.status] || statusConfig.Draft;
  const StatusIcon = sc.icon;
  const lineItems = pa.lineItems || [];

  /* Labels based on version */
  const lblToOwner = isSub ? 'TO OWNER/CONTRACTOR:' : 'TO OWNER:';
  const lblFromContractor = isSub ? 'FROM SUBCONTRACTOR:' : 'FROM CONTRACTOR:';
  const lblAppTitle = isSub ? "SUBCONTRACTOR'S APPLICATION FOR PAYMENT" : "CONTRACTOR'S APPLICATION FOR PAYMENT";
  const lblG702 = isSub ? 'AIA DOCUMENT G702S' : 'AIA DOCUMENT G702';
  const lblG703 = isSub ? 'AIA DOCUMENT G703S' : 'AIA DOCUMENT G703';
  const lblHeaderG702 = isSub
    ? 'APPLICATION AND CERTIFICATION FOR PAYMENT, CONTRACTOR-SUBCONTRACTOR VERSION'
    : 'APPLICATION AND CERTIFICATION FOR PAYMENT';
  const lblHeaderG703 = isSub
    ? 'CONTINUATION SHEET, CONTRACTOR-SUBCONTRACTOR VERSION'
    : 'CONTINUATION SHEET';
  const lblCertEntity = isSub ? 'Subcontractor' : 'Contractor';

  /* Compute grand totals from line items */
  const grandTotals = lineItems.reduce(
    (acc, li) => ({
      scheduledValue: acc.scheduledValue + (li.scheduledValue || 0),
      previousApplication: acc.previousApplication + (li.previousApplication || 0),
      thisPeriod: acc.thisPeriod + getThisPeriod(li),
      materialsStored: acc.materialsStored + (li.materialsStored || 0),
      totalCompleted: acc.totalCompleted + (li.totalCompleted || 0),
      balanceToFinish: acc.balanceToFinish + (li.balanceToFinish || 0),
      retainage: acc.retainage + (li.retainage || 0),
    }),
    { scheduledValue: 0, previousApplication: 0, thisPeriod: 0, materialsStored: 0, totalCompleted: 0, balanceToFinish: 0, retainage: 0 }
  );
  const grandPct = grandTotals.scheduledValue ? ((grandTotals.totalCompleted / grandTotals.scheduledValue) * 100) : 0;

  const cos = pa.changeOrderSummary || {};
  const totalAdditions = (cos.previousAdditions || 0) + (cos.thisMonthAdditions || 0);
  const totalDeductions = (cos.previousDeductions || 0) + (cos.thisMonthDeductions || 0);
  const netChanges = totalAdditions - totalDeductions;

  const retPct = pa.retainagePercent;

  /* Separate base items from change order items */
  const baseItems = lineItems.filter(li => !li.description.startsWith('CO #'));
  const coItems = lineItems.filter(li => li.description.startsWith('CO #'));

  const hasBackup = pa.backupDrawHistory && pa.backupDrawHistory.length > 0;

  /* ── Shared styles ─────────────────────────────────────────── */
  const b = '1px solid #000';
  const cellBase = { border: b, padding: '4px 6px', fontSize: 11, verticalAlign: 'top' };
  const cellR = { ...cellBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const cellC = { ...cellBase, textAlign: 'center' };

  const darkHeaderBg = '#1a1a2e';
  const greenHeaderBg = '#2d5f2d';

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6,
    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  };

  const tabBtnStyle = (active) => ({
    padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6,
    background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#333',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  });

  /* ──────────────────────────────────────────────────────────────
     PAGE 1: G702
     ────────────────────────────────────────────────────────────── */
  const renderG702 = () => {
    const valCellStyle = { borderBottom: b, borderLeft: b, padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11, width: 140 };
    const labelCellStyle = { borderBottom: b, padding: '5px 8px', fontSize: 11 };

    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#000', background: '#fff', maxWidth: 1080, margin: '16px auto 0', padding: '0 32px 24px' }}>

        {/* Top header bar */}
        <div style={{ background: darkHeaderBg, color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>{lblHeaderG702}</span>
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>{lblG702}</span>
        </div>

        {/* Info section — bordered grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: b }}>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td style={{ ...cellBase, width: '30%', fontWeight: 700, borderTop: 'none' }}>{lblToOwner}</td>
              <td style={{ ...cellBase, width: '30%', fontWeight: 700, borderTop: 'none' }}>PROJECT:</td>
              <td style={{ ...cellBase, width: '22%', borderTop: 'none' }}><strong>APPLICATION NO:</strong> {pa.applicationNo}</td>
              <td style={{ ...cellBase, width: '18%', borderTop: 'none' }}>Distribution to:</td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td style={cellBase}>{pa.owner}</td>
              <td style={cellBase}>{pa.projectName}</td>
              <td style={cellBase}><strong>PERIOD TO:</strong> {formatDate(pa.periodTo)}</td>
              <td style={cellBase}><span style={{ fontFamily: 'monospace' }}>X</span> OWNER</td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td style={cellBase}>{pa.ownerAddress || ''}</td>
              <td style={cellBase}>{pa.projectLocation || ''}</td>
              <td style={cellBase}><strong>CONTRACT DATE:</strong> {formatDate(pa.contractDate)}</td>
              <td style={cellBase}><span style={{ fontFamily: 'monospace' }}>{'\u2610'}</span> ARCHITECT</td>
            </tr>
            {/* Row 4 */}
            <tr>
              <td style={cellBase}></td>
              <td style={cellBase}></td>
              <td style={cellBase}></td>
              <td style={cellBase}><span style={{ fontFamily: 'monospace' }}>{'\u2610'}</span> CONTRACTOR</td>
            </tr>
          </tbody>
        </table>

        {/* FROM line */}
        <div style={{ border: b, borderTop: 'none', padding: '6px 8px', fontSize: 11 }}>
          <strong>{lblFromContractor}</strong><br />
          {isSub ? pa.subcontractor : (pa.contractor || 'Boulder Construction')}
        </div>

        {/* Main form body — two columns side by side */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
          <tbody>
            <tr>
              {/* LEFT COLUMN — Lines 1-9 */}
              <td style={{ border: b, width: '55%', verticalAlign: 'top', padding: 0 }}>
                {/* Title */}
                <div style={{ padding: '8px 8px 4px', fontWeight: 700, fontSize: 13 }}>{lblAppTitle}</div>
                <div style={{ padding: '0 8px 6px', fontSize: 9, color: '#333' }}>
                  Application is made for payment, as shown below, in connection with the {isSub ? 'Subcontract' : 'Contract'}.<br />
                  Continuation Sheet, {lblG703}, is attached.
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {/* Line 1 */}
                    <tr>
                      <td style={labelCellStyle}><strong>1.</strong> ORIGINAL CONTRACT SUM</td>
                      <td style={valCellStyle}>{fmt(pa.originalContractSum)}</td>
                    </tr>
                    {/* Line 2 */}
                    <tr>
                      <td style={labelCellStyle}><strong>2.</strong> Net change by Change Orders</td>
                      <td style={valCellStyle}>{fmt(pa.netChangeOrders)}</td>
                    </tr>
                    {/* Line 3 */}
                    <tr>
                      <td style={{ ...labelCellStyle, fontWeight: 700 }}>3. CONTRACT SUM TO DATE (Line 1 {'\u00B1'} 2)</td>
                      <td style={{ ...valCellStyle, fontWeight: 700 }}>{fmt(pa.contractSumToDate)}</td>
                    </tr>
                    {/* Line 4 */}
                    <tr>
                      <td style={labelCellStyle}>
                        <strong>4.</strong> TOTAL COMPLETED & STORED TO<br />
                        <span style={{ paddingLeft: 14, fontSize: 9 }}>DATE (Column G on G703)</span>
                      </td>
                      <td style={valCellStyle}>{fmt(pa.totalCompletedAndStored)}</td>
                    </tr>
                    {/* Line 5 header */}
                    <tr>
                      <td style={{ padding: '4px 8px 0', fontSize: 11, borderBottom: 'none' }}><strong>5.</strong> RETAINAGE:</td>
                      <td style={{ borderLeft: b, borderBottom: 'none' }}></td>
                    </tr>
                    {/* Line 5a */}
                    <tr>
                      <td style={{ padding: '2px 8px 2px 24px', fontSize: 11, borderBottom: 'none' }}>
                        a. {retPct === 'Variable' ? '___' : retPct}% of Completed Work
                        <span style={{ fontSize: 9, color: '#555' }}> (Column D + E on G703)</span>
                      </td>
                      <td style={{ borderLeft: b, padding: '2px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11, borderBottom: 'none' }}>
                        {fmt(pa.retainageOnCompleted)}
                      </td>
                    </tr>
                    {/* Line 5b */}
                    <tr>
                      <td style={{ padding: '2px 8px 2px 24px', fontSize: 11, borderBottom: 'none' }}>
                        b. {retPct === 'Variable' ? '___' : retPct}% of Stored Material
                        <span style={{ fontSize: 9, color: '#555' }}> (Column F on G703)</span>
                      </td>
                      <td style={{ borderLeft: b, padding: '2px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11, borderBottom: 'none' }}>
                        {fmt(pa.retainageOnStored || 0)}
                      </td>
                    </tr>
                    {/* Total Retainage */}
                    <tr>
                      <td style={{ ...labelCellStyle, paddingLeft: 24, fontSize: 11 }}>
                        Total Retainage (Lines 5a + 5b or<br />
                        <span style={{ paddingLeft: 0 }}>Total in Column I of G703)</span>
                      </td>
                      <td style={{ ...valCellStyle, textDecoration: 'underline' }}>{fmt(pa.totalRetainage)}</td>
                    </tr>
                    {/* Line 6 */}
                    <tr>
                      <td style={{ ...labelCellStyle, fontWeight: 700 }}>6. TOTAL EARNED LESS RETAINAGE<br /><span style={{ fontSize: 9, fontWeight: 400, paddingLeft: 14 }}>(Line 4 Less Line 5 Total)</span></td>
                      <td style={{ ...valCellStyle, fontWeight: 700 }}>{fmt(pa.totalEarnedLessRetainage)}</td>
                    </tr>
                    {/* Line 7 */}
                    <tr>
                      <td style={labelCellStyle}>
                        <strong>7.</strong> LESS PREVIOUS CERTIFICATES FOR<br />
                        <span style={{ paddingLeft: 14, fontSize: 9 }}>PAYMENT (Line 6 from prior Certificate)</span>
                      </td>
                      <td style={valCellStyle}>{fmt(pa.lessPreviousCertificates)}</td>
                    </tr>
                    {/* Line 8 — CURRENT PAYMENT DUE */}
                    <tr style={{ background: '#fef9c3' }}>
                      <td style={{ borderBottom: '2px solid #000', padding: '7px 8px', fontSize: 13, fontWeight: 800 }}>
                        8. CURRENT PAYMENT DUE
                      </td>
                      <td style={{ borderBottom: '2px solid #000', borderLeft: '2px solid #000', padding: '7px 8px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 14, textDecoration: 'underline' }}>
                        {fmt(pa.currentPaymentDue)}
                      </td>
                    </tr>
                    {/* Line 9 */}
                    <tr>
                      <td style={{ padding: '5px 8px', fontSize: 11 }}>
                        <strong>9.</strong> BALANCE TO FINISH, INCLUDING RETAINAGE<br />
                        <span style={{ paddingLeft: 14, fontSize: 9 }}>(Line 3 less Line 6)</span>
                      </td>
                      <td style={{ borderLeft: b, padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                        {fmt(pa.balanceToFinish)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* RIGHT COLUMN — Certification */}
              <td style={{ border: b, width: '45%', verticalAlign: 'top', padding: '8px 10px', fontSize: 10, lineHeight: 1.4 }}>
                <p style={{ margin: '0 0 10px', textAlign: 'justify' }}>
                  The undersigned {lblCertEntity} certifies that to the best of the {lblCertEntity}'s knowledge,
                  information and belief the Work covered by this Application for Payment has been completed
                  in accordance with the Contract Documents, that all amounts have been paid by the {lblCertEntity} for
                  Work for which previous Certificates for Payment were issued and payments received from the
                  Owner{isSub ? '/Contractor' : ''}, and that current payment shown herein is now due.
                </p>

                <div style={{ marginTop: 14, fontSize: 10 }}>
                  <strong>{lblCertEntity.toUpperCase()}:</strong><br />
                  By: _________________________ Date: _____________<br /><br />
                  State of: _________ County of: _________<br /><br />
                  Subscribed and sworn to before me this _____ day of _______<br /><br />
                  Notary Public: _________________________<br /><br />
                  My Commission expires: _________________________
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* CHANGE ORDER SUMMARY */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, borderBottom: '2px solid #000', paddingBottom: 2 }}>CHANGE ORDER SUMMARY</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: b }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ ...cellBase, fontWeight: 700 }}></td>
                <td style={{ ...cellC, fontWeight: 700, width: 140 }}>ADDITIONS</td>
                <td style={{ ...cellC, fontWeight: 700, width: 140 }}>DEDUCTIONS</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={cellBase}>Total changes approved in previous months by Owner</td>
                <td style={cellR}>{fmt(cos.previousAdditions || 0)}</td>
                <td style={cellR}>{fmt(cos.previousDeductions || 0)}</td>
              </tr>
              <tr>
                <td style={cellBase}>Total approved this Month</td>
                <td style={cellR}>{fmt(cos.thisMonthAdditions || 0)}</td>
                <td style={cellR}>{fmt(cos.thisMonthDeductions || 0)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td style={{ ...cellBase, fontWeight: 700 }}>TOTALS</td>
                <td style={{ ...cellR, fontWeight: 700 }}>{fmt(totalAdditions)}</td>
                <td style={{ ...cellR, fontWeight: 700 }}>{fmt(totalDeductions)}</td>
              </tr>
              <tr>
                <td style={{ ...cellBase, fontWeight: 700 }}>NET CHANGES by Change Order</td>
                <td colSpan={2} style={{ ...cellR, fontWeight: 700 }}>{fmt(netChanges)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ──────────────────────────────────────────────────────────────
     PAGE 2: G703 — CONTINUATION SHEET
     ────────────────────────────────────────────────────────────── */
  const renderG703 = () => {
    const thStyle = { border: b, padding: '3px 4px', fontSize: 8, fontWeight: 700, textAlign: 'center', color: '#fff', background: greenHeaderBg, verticalAlign: 'bottom' };
    const tdN = { border: b, padding: '3px 4px', fontSize: 10, textAlign: 'center', verticalAlign: 'top' };
    const tdL = { border: b, padding: '3px 4px', fontSize: 10, verticalAlign: 'top' };
    const tdR = { border: b, padding: '3px 4px', fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' };
    const tdRBold = { ...tdR, fontWeight: 700 };

    const renderRow = (li, isSubRow) => {
      const tp = getThisPeriod(li);
      const pct = li.scheduledValue ? ((li.totalCompleted / li.scheduledValue) * 100) : 0;
      return (
        <tr key={li.itemNo + (isSubRow ? '-sub' : '')}>
          <td style={tdN}>{li.itemNo}</td>
          <td style={{ ...tdL, fontStyle: isSubRow ? 'italic' : 'normal', paddingLeft: isSubRow ? 12 : 4 }}>
            {isSubRow ? '- ' : ''}{li.description}
          </td>
          <td style={tdR}>{fmtDash(li.scheduledValue)}</td>
          <td style={tdR}>{fmtDash(li.previousApplication)}</td>
          <td style={tdR}>{fmtDash(tp)}</td>
          <td style={tdR}>{fmtDash(li.materialsStored)}</td>
          <td style={tdR}>{fmtDash(li.totalCompleted)}</td>
          <td style={tdN}>{li.totalCompleted !== 0 ? fmtPct(pct) : '0.0%'}</td>
          <td style={tdR}>{fmtDash(li.balanceToFinish)}</td>
          <td style={tdR}>{fmtDash(li.retainage)}</td>
        </tr>
      );
    };

    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#000', background: '#fff', maxWidth: 1080, margin: '16px auto 0', padding: '0 32px 24px' }}>

        {/* Header bar */}
        <div style={{ background: darkHeaderBg, color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>{lblHeaderG703}</span>
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>{lblG703}</span>
        </div>

        {/* Info rows */}
        <div style={{ textAlign: 'right', padding: '6px 0', fontSize: 11, borderBottom: b }}>
          <div><strong>APPLICATION NO:</strong> {pa.applicationNo}</div>
          <div><strong>APPLICATION DATE:</strong> {formatDate(pa.applicationDate)}</div>
          <div><strong>PERIOD TO:</strong> {formatDate(pa.periodTo)}</div>
          <div><strong>PROJECT NO:</strong></div>
        </div>

        {/* G703 Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: b, marginTop: 0 }}>
          <thead>
            {/* Letter row */}
            <tr>
              <th style={{ ...thStyle, width: 40 }}>A</th>
              <th style={thStyle}>B</th>
              <th style={{ ...thStyle, width: 90 }}>C</th>
              <th style={{ ...thStyle, width: 90 }}>D</th>
              <th style={{ ...thStyle, width: 80 }}>E</th>
              <th style={{ ...thStyle, width: 80 }}>F</th>
              <th style={{ ...thStyle, width: 95 }}>G</th>
              <th style={{ ...thStyle, width: 45 }}>H</th>
              <th style={{ ...thStyle, width: 85 }}>I</th>
              <th style={{ ...thStyle, width: 80 }}>J</th>
            </tr>
            {/* Category row */}
            <tr>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
              <th colSpan={2} style={thStyle}>WORK COMPLETED</th>
              <th style={thStyle}>MATERIALS</th>
              <th style={thStyle}>TOTAL</th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
              <th style={thStyle}></th>
            </tr>
            {/* Full description row */}
            <tr>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>ITEM<br />NO.</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>DESCRIPTION<br />OF WORK</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>SCHEDULED<br />VALUE</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>FROM PREVIOUS<br />APPLICATION<br />(D+E)</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>THIS<br />PERIOD</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>PRESENTLY<br />STORED<br />(NOT IN D OR E)</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>COMPLETED<br />AND STORED<br />TO DATE<br />(D+E+F)</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>%<br />(G{'\u00F7'}C)</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>BALANCE<br />TO FINISH<br />(C-G)</th>
              <th style={{ ...thStyle, fontSize: 7, lineHeight: 1.2 }}>RETAINAGE<br />(IF VARIABLE<br />RATE)</th>
            </tr>
          </thead>
          <tbody>
            {/* Base items */}
            {baseItems.map((li) => renderRow(li, false))}

            {/* Separator row if there are change orders */}
            {coItems.length > 0 && (
              <tr>
                <td colSpan={10} style={{ ...tdL, fontWeight: 700, fontSize: 9, background: '#f5f5f5', padding: '3px 6px' }}>
                  CHANGE ORDERS
                </td>
              </tr>
            )}

            {/* Change order items */}
            {coItems.map((li) => renderRow(li, false))}

            {/* GRAND TOTAL */}
            <tr style={{ fontWeight: 700, background: '#e8e8e8' }}>
              <td style={{ ...tdN, fontWeight: 700 }}></td>
              <td style={{ ...tdL, fontWeight: 700 }}>GRAND TOTAL</td>
              <td style={tdRBold}>{fmt(grandTotals.scheduledValue)}</td>
              <td style={tdRBold}>{fmt(grandTotals.previousApplication)}</td>
              <td style={tdRBold}>{fmt(grandTotals.thisPeriod)}</td>
              <td style={tdRBold}>{fmt(grandTotals.materialsStored)}</td>
              <td style={tdRBold}>{fmt(grandTotals.totalCompleted)}</td>
              <td style={{ ...tdN, fontWeight: 700 }}>{fmtPct(grandPct)}</td>
              <td style={tdRBold}>{fmt(grandTotals.balanceToFinish)}</td>
              <td style={tdRBold}>{fmt(grandTotals.retainage)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  /* ──────────────────────────────────────────────────────────────
     PAGE 3: BACKUP — PAYMENT HISTORY
     ────────────────────────────────────────────────────────────── */
  const renderBackup = () => {
    if (!hasBackup) return <div style={{ padding: 40, textAlign: 'center' }}>No backup payment history available.</div>;

    const draws = pa.backupDrawHistory;
    const currentDrawNo = pa.applicationNo;
    const priorDraws = draws.filter(d => d.draw < currentDrawNo);
    const currentDraw = draws.find(d => d.draw === currentDrawNo);

    const thStyle = { border: b, padding: '4px 6px', fontSize: 9, fontWeight: 700, textAlign: 'center', color: '#fff', background: greenHeaderBg };
    const tdN = { border: b, padding: '3px 6px', fontSize: 10, textAlign: 'center', verticalAlign: 'top' };
    const tdL = { border: b, padding: '3px 6px', fontSize: 10, verticalAlign: 'top' };
    const tdR = { border: b, padding: '3px 6px', fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' };

    /* Compute prior totals */
    let priorTotalAmt = 0, priorTotalRet = 0, priorTotalNet = 0;
    priorDraws.forEach(d => d.items.forEach(it => {
      priorTotalAmt += it.amount;
      priorTotalRet += it.retainage;
      priorTotalNet += it.netAmount;
    }));

    /* Compute current draw totals */
    let curTotalAmt = 0, curTotalRet = 0, curTotalNet = 0;
    if (currentDraw) {
      currentDraw.items.forEach(it => {
        curTotalAmt += it.amount;
        curTotalRet += it.retainage;
        curTotalNet += it.netAmount;
      });
    }

    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#000', background: '#fff', maxWidth: 1080, margin: '16px auto 0', padding: '0 32px 24px' }}>

        {/* PRIOR PAYMENTS */}
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Prior Payments</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: b }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 50 }}>Draw #</th>
              <th style={{ ...thStyle, width: 50 }}>G703 #</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Commentary</th>
              <th style={{ ...thStyle, width: 100 }}>Amount</th>
              <th style={{ ...thStyle, width: 85 }}>Retainage</th>
              <th style={{ ...thStyle, width: 100 }}>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {priorDraws.map((draw) =>
              draw.items.map((it, idx) => (
                <tr key={`prior-${draw.draw}-${idx}`}>
                  <td style={tdN}>{idx === 0 ? draw.draw : ''}</td>
                  <td style={tdN}>{it.g703No}</td>
                  <td style={tdL}>{it.description}</td>
                  <td style={tdL}>{it.commentary || ''}</td>
                  <td style={tdR}>{fmt(it.amount)}</td>
                  <td style={tdR}>{fmt(it.retainage)}</td>
                  <td style={tdR}>{fmt(it.netAmount)}</td>
                </tr>
              ))
            )}
            {/* Prior total */}
            <tr style={{ fontWeight: 700, background: '#e8e8e8' }}>
              <td colSpan={4} style={{ ...tdL, fontWeight: 700 }}>Total</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{fmt(priorTotalAmt)}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{fmt(priorTotalRet)}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{fmt(priorTotalNet)}</td>
            </tr>
          </tbody>
        </table>

        {/* NEW PAYMENT REQUESTS */}
        {currentDraw && (
          <>
            <div style={{ fontWeight: 700, fontSize: 14, margin: '20px 0 8px' }}>New Payment Requests</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: b }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 50 }}>G703 #</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Commentary</th>
                  <th style={{ ...thStyle, width: 100 }}>Amount</th>
                  <th style={{ ...thStyle, width: 85 }}>Retainage</th>
                  <th style={{ ...thStyle, width: 100 }}>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {currentDraw.items.map((it, idx) => (
                  <tr key={`cur-${idx}`}>
                    <td style={tdN}>{it.g703No}</td>
                    <td style={tdL}>{it.description}</td>
                    <td style={tdL}>{it.commentary || ''}</td>
                    <td style={tdR}>{fmt(it.amount)}</td>
                    <td style={tdR}>{fmt(it.retainage)}</td>
                    <td style={tdR}>{fmt(it.netAmount)}</td>
                  </tr>
                ))}
                {/* Current draw total */}
                <tr style={{ fontWeight: 700, background: '#e8e8e8' }}>
                  <td colSpan={3} style={{ ...tdL, fontWeight: 700 }}>Total</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{fmt(curTotalAmt)}</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{fmt(curTotalRet)}</td>
                  <td style={{ ...tdR, fontWeight: 700 }}>{fmt(curTotalNet)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: letter; margin: 0.35in 0.4in; }
        }
        @media screen {
          .print-page { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        }
      `}</style>

      {/* Action Buttons + Tabs */}
      <div className="no-print" style={{ maxWidth: 1080, margin: '0 auto', padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <button onClick={() => navigate('/pay-applications')} style={btnStyle}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} style={btnStyle}>
          <Printer size={16} /> Print
        </button>
        <button onClick={() => alert('PDF download will be available in a future update.')} style={btnStyle}>
          <Download size={16} /> Download PDF
        </button>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: sc.color, background: sc.bg }}>
          <StatusIcon size={14} /> {pa.status}
        </span>
      </div>

      {/* Tab buttons */}
      <div className="no-print" style={{ maxWidth: 1080, margin: '12px auto 0', padding: '0 24px', display: 'flex', gap: 8, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <button onClick={() => setActiveTab('g702')} style={tabBtnStyle(activeTab === 'g702')}>
          G702 — Application
        </button>
        <button onClick={() => setActiveTab('g703')} style={tabBtnStyle(activeTab === 'g703')}>
          G703 — Continuation Sheet
        </button>
        {hasBackup && (
          <button onClick={() => setActiveTab('backup')} style={tabBtnStyle(activeTab === 'backup')}>
            Backup — Payment History
          </button>
        )}
      </div>

      {/* Page content */}
      <div className="print-page">
        {activeTab === 'g702' && renderG702()}
        {activeTab === 'g703' && renderG703()}
        {activeTab === 'backup' && renderBackup()}
      </div>
    </>
  );
}
