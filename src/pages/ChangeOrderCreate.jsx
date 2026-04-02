import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload } from 'lucide-react';
import { projects } from '../data/mockData';

const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' };

export default function ChangeOrderCreate() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [amount, setAmount] = useState('');
  const [justification, setJustification] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === projectId);
    alert(`Change Order submitted for "${proj?.name || 'Unknown Project'}" — $${parseFloat(amount || 0).toLocaleString()} (UI only)`);
    navigate('/change-orders');
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/change-orders')}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, padding: 0, marginBottom: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Back to Change Orders
        </button>
        <h1 className="page-title">New Change Order</h1>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '2rem', maxWidth: '950px' }}>
          {/* Row 1: Project & Requested By */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select
                className="input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Requested By</label>
              <select
                className="input"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="">Select requestor...</option>
                {['Client', 'Contractor', 'Architect', 'Engineer'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe the proposed change..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Amount ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Justification / Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Justification / Notes</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Provide justification or additional notes for this change order..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Supporting Documents */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Supporting Documents</label>
            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              <Upload size={28} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem', color: '#64748b' }}>
                Drag and drop files here, or click to browse
              </p>
              <p style={{ fontSize: '0.75rem' }}>PDF, JPG, PNG, or DWG up to 25 MB</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => navigate('/change-orders')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Send size={16} /> Submit Change Order
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
