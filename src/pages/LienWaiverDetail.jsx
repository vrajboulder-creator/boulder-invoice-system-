import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle, Loader2 } from 'lucide-react';
import { lienWaiverService } from '../services/supabaseService';
import { useSupabaseById } from '../hooks/useSupabase';
import { lienWaivers as mockLienWaivers } from '../data/mockData';
import { downloadPdf } from '../utils/downloadPdf';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const statusBadge = (status) => {
  const map = {
    Signed: 'badge-green',
    'Pending Signature': 'badge-amber',
    Draft: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

/** Normalize a waiver from either Supabase (snake_case) or mock (camelCase) into a consistent shape */
function normalizeWaiver(w) {
  if (!w) return null;
  return {
    id: w.id,
    waiverCategory: w.waiver_category || w.waiverCategory || 'Partial',
    conditionType: w.condition_type || w.conditionType || 'Conditional',
    projectName: w.project_name || w.projectName || '',
    projectId: w.project_id || w.projectId || '',
    signerName: w.signer_name || w.signerName || '',
    furnisher: w.furnisher || '',
    ownerContractor: w.owner_contractor || w.ownerContractor || '',
    jobNameAddress: w.job_name_address || w.jobNameAddress || '',
    waiverAmount: w.waiver_amount ?? w.waiverAmount ?? 0,
    finalBalance: w.final_balance ?? w.finalBalance ?? 0,
    paymentCondition: w.payment_condition || w.paymentCondition || '',
    signerCompany: w.signer_company || w.signerCompany || '',
    signerTitle: w.signer_title || w.signerTitle || '',
    relatedPayApp: w.pay_application_id || w.relatedPayApp || '',
    date: w.waiver_date || w.date || '',
    status: w.status || '',
  };
}

/* Print styles injected once */
const PrintStyles = () => (
  <style>{`
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; margin: 0; }
      .lien-waiver-page { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0.5in 0.65in !important; }
    }
  `}</style>
);

/* Underline blank field for the form */
const BlankLine = ({ width = 200, value = '' }) => (
  <span
    style={{
      borderBottom: '1px solid #000',
      display: 'inline-block',
      minWidth: width,
      padding: '0 4px 1px',
      fontWeight: 500,
      textAlign: 'center',
    }}
  >
    {value || '\u00A0'}
  </span>
);

/* Italic caption label below fields */
const Caption = ({ children, style = {} }) => (
  <span style={{ display: 'block', fontSize: '0.65rem', fontStyle: 'italic', color: '#555', textAlign: 'center', marginTop: 1, ...style }}>
    {children}
  </span>
);

/* Checkbox square */
const Checkbox = ({ checked }) => (
  <span
    style={{
      display: 'inline-block',
      width: 13,
      height: 13,
      border: '1.5px solid #000',
      marginRight: 5,
      position: 'relative',
      top: 2,
      textAlign: 'center',
      lineHeight: '11px',
      fontSize: '0.7rem',
      fontWeight: 700,
    }}
  >
    {checked ? '\u2713' : ''}
  </span>
);

export default function LienWaiverDetail() {
  const { id } = useParams();
  const [signing, setSigning] = useState(false);

  const mockFinder = useCallback(
    (searchId) => mockLienWaivers.find((w) => w.id === searchId) || null,
    [],
  );

  const { data: rawWaiver, loading, setData } = useSupabaseById(lienWaiverService.getById, id, mockFinder);
  const waiver = normalizeWaiver(rawWaiver);

  if (loading) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
          <span style={{ marginLeft: '0.75rem', color: '#64748b', fontSize: '1.125rem' }}>Loading waiver...</span>
        </div>
      </div>
    );
  }

  if (!waiver) {
    return (
      <div style={{ padding: '1.5rem' }}>
        <Link
          to="/lien-waivers"
          style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
        >
          <ArrowLeft size={16} /> Back to Lien Waivers
        </Link>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Lien waiver not found.</p>
        </div>
      </div>
    );
  }

  const isPartial = waiver.waiverCategory === 'Partial';
  const isFinal = waiver.waiverCategory === 'Final';
  const isUnconditional = waiver.conditionType === 'Unconditional';
  const isConditional = waiver.conditionType === 'Conditional';

  const handlePrint = () => window.print();
  const handleDownload = () => downloadPdf('lien-waiver-pdf-content', `LienWaiver-${waiver.waiverCategory}-${waiver.id}`);

  const handleMarkSigned = async () => {
    setSigning(true);
    try {
      const updated = await lienWaiverService.sign(waiver.id);
      setData(updated);
    } catch (err) {
      console.error('Failed to sign waiver:', err);
      setData((prev) => (prev ? { ...prev, status: 'Signed', waiver_date: new Date().toISOString().split('T')[0], date: new Date().toISOString().split('T')[0] } : prev));
    } finally {
      setSigning(false);
    }
  };

  const year = waiver.date ? new Date(waiver.date).getFullYear() : new Date().getFullYear();

  /* ---- Styles ---- */
  const formFont = {
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    fontSize: '0.85rem',
    lineHeight: 1.65,
    color: '#000',
  };

  const formPage = {
    background: '#fff',
    color: '#000',
    maxWidth: '8.5in',
    margin: '0 auto',
    padding: '40px 52px',
    border: '1px solid #d1d5db',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    ...formFont,
  };

  const btnStyle = (bg, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    borderRadius: 6,
    border: 'none',
    background: bg,
    color,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  });

  const sectionBox = {
    border: '1px solid #999',
    padding: '14px 18px',
    marginBottom: 18,
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <PrintStyles />

      {/* ===== Action Bar (hidden on print) ===== */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Link
          to="/lien-waivers"
          style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> Back to Lien Waivers
        </Link>

        <div style={{ flex: 1 }} />

        <span className={`badge ${statusBadge(waiver.status)}`}>{waiver.status}</span>

        {(waiver.status === 'Draft' || waiver.status === 'Pending Signature') && (
          <button
            style={btnStyle('#2563eb', '#fff')}
            className="btn-primary"
            onClick={handleMarkSigned}
            disabled={signing}
          >
            <CheckCircle size={15} /> {signing ? 'Signing...' : 'Mark as Signed'}
          </button>
        )}

        <button style={btnStyle('#f1f5f9', '#334155')} onClick={handlePrint}>
          <Printer size={15} /> Print
        </button>

        <button style={btnStyle('#f1f5f9', '#334155')} onClick={handleDownload}>
          <Download size={15} /> Download PDF
        </button>
      </div>

      {/* ===== Payment Summary Banner (no-print) ===== */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.875rem 1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Payment</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            {formatCurrency(isPartial ? waiver.waiverAmount : waiver.finalBalance)}
          </p>
        </div>
        {isPartial && (
          <div style={{ flex: 1, minWidth: 180, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '0.875rem 1.25rem' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Balance</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              {formatCurrency(waiver.finalBalance)}
            </p>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 180, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.875rem 1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiver Type</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {waiver.waiverCategory} &middot; {waiver.conditionType}
          </p>
          <span className={`badge ${waiver.waiverCategory === 'Final' ? 'badge-green' : 'badge-blue'}`} style={{ marginTop: 4, display: 'inline-block' }}>
            {waiver.waiverCategory === 'Final' ? 'Full Release' : 'Partial Release'}
          </span>
        </div>
      </div>

      {/* ===== Printable Affidavit Form ===== */}
      <div id="lien-waiver-pdf-content" className="lien-waiver-page" style={formPage}>

        {/* --- Title --- */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: '0.5px', margin: 0 }}>
            AFFIDAVIT, RELEASE AND WAIVER OF LIEN
          </h1>
        </div>

        {/* --- Partial / Final Checkboxes --- */}
        <div style={{ textAlign: 'center', marginBottom: 18, fontSize: '0.85rem' }}>
          <Checkbox checked={isPartial} />
          <span style={{ fontWeight: 600, marginRight: 24 }}>PARTIAL</span>
          <Checkbox checked={isFinal} />
          <span style={{ fontWeight: 600 }}>FINAL</span>
        </div>

        {/* --- Sworn Statement Line 1: I, ___ being duly sworn, state that ___ --- */}
        <div style={{ marginBottom: 6 }}>
          <span>I, </span>
          <BlankLine width={240} value={waiver.signerName} />
          <span>being duly sworn, state that </span>
          <BlankLine width={200} value={waiver.furnisher} />
        </div>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: 2 }}>
          <div style={{ flex: 1 }}>
            <Caption style={{ textAlign: 'left', marginLeft: 16 }}>Name</Caption>
          </div>
          <div style={{ flex: 1 }}>
            <Caption style={{ textAlign: 'right' }}>Furnisher</Caption>
          </div>
        </div>

        {/* --- Line 2: contracted with ___ to furnish certain materials and/or labor for the --- */}
        <div style={{ marginBottom: 6 }}>
          <span>contracted with </span>
          <BlankLine width={320} value={waiver.ownerContractor} />
          <span> to furnish certain materials and/or labor for the</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          <Caption style={{ textAlign: 'left', marginLeft: 100 }}>Owner or Prime Contractor</Caption>
        </div>

        {/* --- Line 3: following project known as ___ and do hereby further state on --- */}
        <div style={{ marginBottom: 6 }}>
          <span>following project known as </span>
          <BlankLine width={340} value={waiver.projectName + (waiver.jobNameAddress ? ' — ' + waiver.jobNameAddress : '')} />
          <span> and do hereby further state on</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          <Caption style={{ textAlign: 'left', marginLeft: 180 }}>Job Name & Address</Caption>
        </div>

        {/* --- Line 4: behalf of the aforementioned Furnisher... --- */}
        <div style={{ marginBottom: 6 }}>
          <span>behalf of the aforementioned Furnisher for labor or materials supplied to the project thru the date</span>
        </div>

        {/* --- Line 5: of ___,___,20__ : --- */}
        <div style={{ marginBottom: 20 }}>
          <span>of </span>
          <BlankLine width={80} value={waiver.date ? formatDate(waiver.date).split(',')[0]?.split(' ')[1] : ''} />
          <span>,</span>
          <BlankLine width={60} value={waiver.date ? formatDate(waiver.date).split(',')[0]?.split(' ')[0] : ''} />
          <span>,{year} :</span>
        </div>

        {/* --- AFFIDAVIT Header --- */}
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', marginBottom: 18, fontFamily: "Arial, Helvetica, sans-serif" }}>
          AFFIDAVIT
        </div>

        {/* ============ PARTIAL WAIVER Section ============ */}
        <div style={sectionBox}>
          <div style={{ marginBottom: 10 }}>
            <Checkbox checked={isPartial} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}> PARTIAL WAIVER:</span>
            <span>  There is due from </span>
            <BlankLine width={260} value={isPartial ? waiver.ownerContractor : ''} />
            <span> the sum of:</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2 }}>
            <Caption style={{ textAlign: 'left', flex: 1, marginLeft: 20 }}>Owner or Prime Contractor</Caption>
            <span style={{ fontWeight: 600, marginLeft: 10 }}>Dollars</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span>$</span>
            <BlankLine width={120} value={isPartial && waiver.waiverAmount ? formatCurrency(waiver.waiverAmount) : ''} />
          </div>

          <div style={{ paddingLeft: 24 }}>
            <div style={{ marginBottom: 6 }}>
              <Checkbox checked={isPartial && isUnconditional} />
              <span> Receipt of which is hereby acknowledged (unconditional); or</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <Checkbox checked={isPartial && isConditional} />
              <span> The payment of which has been promised as the sole consideration of this Affidavit, Release and Partial</span>
              <div style={{ paddingLeft: 20 }}>
                <span>Waiver of Lien which is given solely with respect to said amount and is effective upon receipt of such</span>
              </div>
              <div style={{ paddingLeft: 20 }}>
                <span>payment (conditional):</span>
              </div>
            </div>
          </div>
          <BlankLine width={'100%'} value={isPartial ? waiver.paymentCondition : ''} />
        </div>

        {/* ============ FINAL WAIVER Section ============ */}
        <div style={sectionBox}>
          <div style={{ marginBottom: 10 }}>
            <Checkbox checked={isFinal} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}> FINAL WAIVER:</span>
            <span>  The final balance due from </span>
            <BlankLine width={220} value={isFinal ? waiver.ownerContractor : ''} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 2 }}>
            <Caption style={{ textAlign: 'left', flex: 1, marginLeft: 20 }}>Owner or Prime Contractor</Caption>
            <span style={{ fontWeight: 600, marginLeft: 10 }}>Dollars</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span>$</span>
            <BlankLine width={120} value={isFinal && waiver.finalBalance ? formatCurrency(waiver.finalBalance) : ''} />
          </div>

          <div style={{ paddingLeft: 24 }}>
            <div style={{ marginBottom: 6 }}>
              <Checkbox checked={isFinal && isUnconditional} />
              <span> Receipt of which is hereby acknowledged (unconditional); or</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <Checkbox checked={isFinal && isConditional} />
              <span> The payment of which has been promised as the sole consideration of this Affidavit, Release and Partial</span>
              <div style={{ paddingLeft: 20 }}>
                <span>Waiver of Lien  which is given solely with respect to said amount and is effective upon receipt of such</span>
              </div>
              <div style={{ paddingLeft: 20 }}>
                <span>payment (conditional):</span>
              </div>
            </div>
          </div>
          <BlankLine width={'100%'} value={isFinal ? waiver.paymentCondition : ''} />
        </div>

        {/* ============ THEREFORE Paragraph ============ */}
        <div style={{ marginBottom: 18, textAlign: 'justify', fontSize: '0.8rem', lineHeight: 1.6 }}>
          <span style={{ fontWeight: 700 }}>THEREFORE</span>, the undersigned waives and releases unto the Owner of said premises any and all liens or claims whatsoever on the above described
          property and improvements thereon on account of labor, material and/or services provided by the undersigned, subject to the limitations or
          conditions expressed herein, if any, and further releases claims of any nature against the Owner/Prime Contractor.  The undersigned further
          certifies that all parties who have provided labor, materials and/or services for said work have been fully paid, or will be fully paid out of the
          payment contemplated herein, if any, such that no other party has or shall have any claim or right to a lien on account of labor, materials and/or
          services provided to the undersigned for said project and within the scope of this Affidavit, Release and Waiver of Lien.
        </div>

        {/* ============ Perjury Oath ============ */}
        <div style={{ marginBottom: 28, fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.6 }}>
          I SWEAR OR AFFIRM UNDER THE PENALTIES OF PERJURY THAT THE FOREGOING STATEMENTS ARE TRUE TO THE BEST
          OF MY KNOWLEDGE.
        </div>

        {/* ============ Signature Block ============ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px', marginTop: 12 }}>
          <div>
            <BlankLine width={'100%'} value={waiver.signerCompany} />
            <Caption>Company Name</Caption>
          </div>
          <div>
            <BlankLine width={'100%'} value={waiver.status === 'Signed' ? waiver.signerName : ''} />
            <Caption>Representative Signature</Caption>
          </div>
          <div>
            <BlankLine width={'100%'} value={waiver.signerTitle} />
            <Caption>Title</Caption>
          </div>
        </div>

        {/* --- Date line --- */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <div>
            <span style={{ fontWeight: 600, marginRight: 8, fontSize: '0.8rem' }}>Date:</span>
            <BlankLine width={160} value={waiver.status === 'Signed' ? formatDate(waiver.date) : ''} />
          </div>
        </div>
      </div>
    </div>
  );
}
