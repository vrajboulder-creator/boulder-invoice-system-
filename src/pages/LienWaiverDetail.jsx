import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle } from 'lucide-react';
import { lienWaivers } from '../data/mockData';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const statusBadge = (status) => {
  const map = {
    Signed: 'badge-green',
    'Pending Signature': 'badge-amber',
    Draft: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

/* Styled underline field — renders the value with an underline to mimic a filled blank */
const Field = ({ value, minWidth = 80 }) => (
  <span
    style={{
      borderBottom: '1px solid #000',
      padding: '0 4px 1px',
      minWidth,
      display: 'inline-block',
      fontWeight: 500,
    }}
  >
    {value || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
  </span>
);

/* Parenthetical label that floats toward the right margin */
const Label = ({ children }) => (
  <span style={{ fontSize: '0.8rem', color: '#444', fontStyle: 'italic' }}>({children})</span>
);

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

export default function LienWaiverDetail() {
  const { id } = useParams();
  const waiver = lienWaivers.find((w) => w.id === id);

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

  /* Determine form variant */
  const isUnconditional = waiver.formType === 'K1' || waiver.formType === 'K3';
  const isFinal = waiver.formType === 'K3' || waiver.formType === 'K4';
  const paymentType = isFinal ? 'final payment' : 'progress payment';
  const paymentTypeTitle = isFinal ? 'Final Payment' : 'Progress Payment';

  const formLabel = `Form ${waiver.formType}`;
  const formTitle = isUnconditional
    ? `Unconditional Waiver and Release on ${paymentTypeTitle}`
    : `Conditional Waiver and Release on ${paymentTypeTitle}`;

  const handlePrint = () => window.print();
  const handleDownload = () => alert('PDF download coming soon.');
  const handleMarkSigned = () => alert(`Waiver ${waiver.id} marked as signed.`);

  /* ---- Styles ---- */
  const legalFont = {
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
    fontSize: '0.92rem',
    lineHeight: 1.75,
    color: '#000',
  };

  const formPage = {
    background: '#fff',
    color: '#000',
    maxWidth: '8.5in',
    margin: '0 auto',
    padding: '48px 56px',
    border: '1px solid #d1d5db',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    ...legalFont,
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

  const paragraphStyle = {
    textIndent: '2em',
    marginBottom: 16,
    textAlign: 'justify',
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
          <button style={btnStyle('#2563eb', '#fff')} className="btn-primary" onClick={handleMarkSigned}>
            <CheckCircle size={15} /> Mark as Signed
          </button>
        )}

        <button style={btnStyle('#f1f5f9', '#334155')} onClick={handlePrint}>
          <Printer size={15} /> Print
        </button>

        <button style={btnStyle('#f1f5f9', '#334155')} onClick={handleDownload}>
          <Download size={15} /> Download PDF
        </button>
      </div>

      {/* ===== Printable Form ===== */}
      <div className="lien-waiver-page" style={formPage}>

        {/* --- Header: Form label centered --- */}
        <div style={{ textAlign: 'center', marginBottom: 12, fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <span style={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: 1 }}>{formLabel}</span>
        </div>

        {/* --- Title block: left-aligned, bold --- */}
        <div style={{ marginBottom: 4, fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>TEXAS</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{formTitle}</div>
          <div style={{ fontSize: '0.85rem', color: '#222' }}>{waiver.statute || 'TEX. PROP. CODE § 53.284'}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '14px 0 18px' }} />

        {/* --- Warning paragraph (unconditional forms only) --- */}
        {isUnconditional && (
          <div
            style={{
              background: '#000',
              color: '#fff',
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: '0.85rem',
              lineHeight: 1.6,
              fontWeight: 700,
              fontFamily: "Georgia, 'Times New Roman', Times, serif",
            }}
          >
            This document waives rights unconditionally and states that you have been paid for giving up
            those rights. It is prohibited for a person to require you to sign this document if you have
            not been paid the payment amount set forth below. If you have not been paid, use a conditional
            release form.
          </div>
        )}

        {/* --- Project / Job No. --- */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: 20 }}>
          <div>
            <span style={{ fontWeight: 600 }}>Project</span>{' '}
            <Field value={waiver.projectName} minWidth={200} />
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Job No.</span>{' '}
            <Field value={waiver.projectId} minWidth={120} />
          </div>
        </div>

        {/* --- Legal body paragraphs --- */}
        {isUnconditional ? (
          /* ===== K1 / K3 — Unconditional ===== */
          <p style={paragraphStyle}>
            THE SIGNER of this document has been paid and has received a {paymentType} in the sum of ${' '}
            <Field value={formatCurrency(waiver.checkAmount)} /> for all labor, services, equipment, or
            materials furnished to the property or to <Field value={waiver.signerCompany} />{' '}
            <Label>person with whom signer contracted</Label> on the property of{' '}
            <Field value={waiver.owner} /> <Label>owner</Label> located at{' '}
            <Field value={waiver.propertyLocation} /> <Label>location</Label> to the following extent:{' '}
            <Field value={waiver.jobDescription} /> <Label>job description</Label>.
          </p>
        ) : (
          /* ===== K2 / K4 — Conditional ===== */
          <p style={paragraphStyle}>
            ON RECEIPT by the signer of this document of a check from{' '}
            <Field value={waiver.makerOfCheck} /> <Label>maker of check</Label> in the sum of ${' '}
            <Field value={formatCurrency(waiver.checkAmount)} /> payable to{' '}
            <Field value={waiver.payableTo} /> <Label>payee or payees of check</Label> and when the check
            has been properly endorsed and has been paid by the bank on which it is drawn, this document
            becomes effective to release any mechanic&rsquo;s lien right, any right arising from a payment
            bond that complies with a state or federal statute, any common law payment bond right, any claim
            for payment, and any rights under any similar ordinance, rule, or statute related to claim or
            payment rights for persons in the signer&rsquo;s position that the signer has on the property of{' '}
            <Field value={waiver.owner} /> <Label>owner</Label> located at{' '}
            <Field value={waiver.propertyLocation} /> <Label>location</Label> to the following extent:{' '}
            <Field value={waiver.jobDescription} /> <Label>job description</Label>.
          </p>
        )}

        {/* Unconditional: second paragraph about waiving rights */}
        {isUnconditional && (
          <p style={paragraphStyle}>
            The signer therefore waives and releases any mechanic&rsquo;s lien right, any right arising from
            a payment bond that complies with a state or federal statute, any common law payment bond right,
            any claim for payment, and any rights under any similar ordinance, rule, or statute related to
            claim or payment rights for persons in the signer&rsquo;s position that the signer has on the
            above referenced project to the following extent:{' '}
            <Field value={waiver.jobDescription} />.
          </p>
        )}

        <p style={paragraphStyle}>
          THIS RELEASE covers a {paymentType} for all labor, services, equipment, or materials furnished to
          the property or to <Field value={waiver.signerCompany} />{' '}
          <Label>person with whom signer contracted</Label> as indicated in the attached statement(s) or{' '}
          {paymentType} request(s), except for unpaid retention, pending modifications and changes, or other
          items furnished.
        </p>

        <p style={{ ...paragraphStyle, marginBottom: 28 }}>
          THE SIGNER warrants that the signer has already paid or will use the funds received from this{' '}
          {paymentType} to promptly pay in full all of the signer&rsquo;s laborers, subcontractors,
          materialmen, and suppliers for all work, materials, equipment, or services provided for or to the
          above referenced project in regard to the attached statement(s) or {paymentType} request(s).
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '24px 0' }} />

        {/* --- Signature block --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 40px', marginTop: 12 }}>
          <div>
            <span style={{ fontWeight: 600 }}>Date:</span>{' '}
            <Field value={formatDate(waiver.date)} minWidth={160} />
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>By:</span>{' '}
            <span
              style={{
                borderBottom: '1px solid #000',
                display: 'inline-block',
                minWidth: 200,
                padding: '0 4px 1px',
                fontStyle: 'italic',
              }}
            >
              {waiver.status === 'Signed' ? waiver.signerName : '\u00A0'}
            </span>{' '}
            <Label>Signature</Label>
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Print Company Name:</span>{' '}
            <Field value={waiver.signerCompany} minWidth={180} />
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>Print Name &amp; Title:</span>{' '}
            <Field value={`${waiver.signerName}, ${waiver.signerTitle}`} minWidth={180} />
          </div>
        </div>

        {/* --- Footer --- */}
        <div
          style={{
            marginTop: 40,
            borderTop: '1px solid #bbb',
            paddingTop: 10,
            fontSize: '0.7rem',
            color: '#888',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>GCM_REV_012712</span>
          <span>&copy; 2012 Granite Commercial Management, LLC. All Rights Reserved</span>
        </div>
      </div>
    </div>
  );
}
