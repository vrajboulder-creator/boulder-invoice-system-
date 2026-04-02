import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileCheck, Eye } from 'lucide-react';
import { projects, clients, payApplications } from '../data/mockData';

const waiverTypes = [
  { value: 'K2', label: 'K2 - Conditional Progress Payment' },
  { value: 'K4', label: 'K4 - Unconditional Progress Payment' },
  { value: 'K1', label: 'K1 - Conditional Final Payment' },
  { value: 'K3', label: 'K3 - Unconditional Final Payment' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

export default function LienWaiverCreate() {
  const navigate = useNavigate();

  const [waiverType, setWaiverType] = useState('');
  const [projectId, setProjectId] = useState('');
  const [owner, setOwner] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [makerOfCheck, setMakerOfCheck] = useState('Boulder Construction');
  const [checkAmount, setCheckAmount] = useState('');
  const [payableTo, setPayableTo] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [relatedPayApp, setRelatedPayApp] = useState('');

  // Auto-fill when project changes
  const handleProjectChange = (id) => {
    setProjectId(id);
    if (id) {
      const proj = projects.find((p) => p.id === id);
      if (proj) {
        setOwner(proj.client);
        const client = clients.find((c) => c.id === proj.clientId);
        const addr = client ? client.address : '';
        setOwnerAddress(addr);
        setPropertyLocation(addr);
        setJobDescription(proj.description || '');
      }
    } else {
      setOwner('');
      setOwnerAddress('');
      setPropertyLocation('');
      setJobDescription('');
    }
  };

  const projectPayApps = useMemo(
    () => (projectId ? payApplications.filter((pa) => pa.projectId === projectId) : payApplications),
    [projectId],
  );

  const selectedWaiverLabel = waiverTypes.find((w) => w.value === waiverType)?.label || '';
  const selectedProjectName = projects.find((p) => p.id === projectId)?.name || '';

  const handleGenerate = () => {
    alert('Lien waiver generated successfully (UI only).');
    navigate('/lien-waivers');
  };

  const handleSaveDraft = () => {
    alert('Lien waiver saved as draft (UI only).');
    navigate('/lien-waivers');
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem',
  };

  const sectionTitle = (text) => (
    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', marginTop: '0.5rem' }}>
      {text}
    </h3>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/lien-waivers')}
          style={{
            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Lien Waivers
        </button>
        <h1 className="page-title">Generate Lien Waiver</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {/* Waiver Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Waiver Type</label>
            <select className="input" value={waiverType} onChange={(e) => setWaiverType(e.target.value)}>
              <option value="">Select waiver type</option>
              {waiverTypes.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Project</label>
            <select className="input" value={projectId} onChange={(e) => handleProjectChange(e.target.value)}>
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Owner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Owner</label>
              <input className="input" type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Property owner name" />
            </div>
            <div>
              <label style={labelStyle}>Owner Address</label>
              <input className="input" type="text" value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} placeholder="Owner address" />
            </div>
          </div>

          {/* Property Location */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Property Location</label>
            <input className="input" type="text" value={propertyLocation} onChange={(e) => setPropertyLocation(e.target.value)} placeholder="Property / job site address" />
          </div>

          {/* Signer Information */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            {sectionTitle('Signer Information')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input className="input" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
              </div>
              <div>
                <label style={labelStyle}>Signer Name</label>
                <input className="input" type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label style={labelStyle}>Title</label>
                <input className="input" type="text" value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} placeholder="Title / role" />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            {sectionTitle('Payment Information')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Maker of Check</label>
                <input className="input" type="text" value={makerOfCheck} onChange={(e) => setMakerOfCheck(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Check Amount ($)</label>
                <input className="input" type="number" min="0" step="0.01" value={checkAmount} onChange={(e) => setCheckAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Payable To</label>
                <input className="input" type="text" value={payableTo} onChange={(e) => setPayableTo(e.target.value)} placeholder="Payee name" />
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Job Description</label>
            <textarea
              className="input"
              rows={3}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Describe the work performed..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Related Pay Application */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={labelStyle}>Related Pay Application</label>
            <select className="input" value={relatedPayApp} onChange={(e) => setRelatedPayApp(e.target.value)}>
              <option value="">None</option>
              {projectPayApps.map((pa) => (
                <option key={pa.id} value={pa.id}>
                  {pa.id} — App #{pa.applicationNo} ({pa.projectName})
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/lien-waivers')}>Cancel</button>
            <button className="btn-secondary" onClick={handleSaveDraft}>
              <Save size={16} /> Save as Draft
            </button>
            <button className="btn-primary" onClick={handleGenerate}>
              <FileCheck size={16} /> Generate Waiver
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#64748b' }}>
            <Eye size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</span>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1.25rem', background: '#fafbfc', fontSize: '0.8rem', lineHeight: 1.7, color: '#334155' }}>
            <h4 style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              LIEN WAIVER
            </h4>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              {selectedWaiverLabel || 'Select a waiver type'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Project</span>
                <p style={{ margin: 0 }}>{selectedProjectName || '---'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Owner</span>
                <p style={{ margin: 0 }}>{owner || '---'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Property Location</span>
                <p style={{ margin: 0 }}>{propertyLocation || '---'}</p>
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Company</span>
                <p style={{ margin: 0 }}>{companyName || '---'}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Signer</span>
              <p style={{ margin: 0 }}>
                {signerName || '---'}{signerTitle ? `, ${signerTitle}` : ''}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Maker of Check</span>
                  <p style={{ margin: 0 }}>{makerOfCheck || '---'}</p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Amount</span>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                    {checkAmount ? formatCurrency(parseFloat(checkAmount)) : '---'}
                  </p>
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Payable To</span>
                  <p style={{ margin: 0 }}>{payableTo || '---'}</p>
                </div>
              </div>
            </div>

            {jobDescription && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Job Description</span>
                <p style={{ margin: 0 }}>{jobDescription}</p>
              </div>
            )}

            {relatedPayApp && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Related Pay Application</span>
                <p style={{ margin: 0 }}>{relatedPayApp}</p>
              </div>
            )}

            <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '1.25rem', paddingTop: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
                Signature: _______________________________
              </p>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                Date: _______________________________
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
