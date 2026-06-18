import { useState, useEffect } from 'react';
import { listApprovals, approveAction, rejectAction } from '../api/hadesExtensionClient.js';

const DEMO_APPROVALS = [
  {
    id: 'app-1',
    title: 'Post: Product Launch',
    risk: 'Medium',
    body: 'Scheduled LinkedIn post announcing the new product launch with pricing details.',
    status: 'pending',
  },
  {
    id: 'app-2',
    title: 'Campaign: Summer Sale',
    risk: 'Low',
    body: 'Instagram story campaign for the summer sale event.',
    status: 'pending',
  },
  {
    id: 'app-3',
    title: 'Reply: Customer Complaint',
    risk: 'High',
    body: 'Draft response to a customer complaint about delayed shipping.',
    status: 'pending',
  },
];

export default function ApprovalQueuePanel({ onToast, onApprovalChange }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadApprovals = () => {
    setLoading(true);
    listApprovals()
      .then((data) => setApprovals(Array.isArray(data) ? data : data.approvals || []))
      .catch(() => setApprovals(DEMO_APPROVALS))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleDecision = async (id, decision) => {
    setProcessingId(id);
    try {
      if (decision === 'approve') {
        await approveAction(id);
      } else {
        await rejectAction(id);
      }
      onToast?.(`Approval ${decision}d`, 'success');
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      onApprovalChange?.();
    } catch (err) {
      onToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const riskClass = (risk) => {
    switch ((risk || '').toLowerCase()) {
      case 'high': return 'chip chip-danger';
      case 'medium': return 'chip chip-warn';
      default: return 'chip chip-info';
    }
  };

  if (loading) {
    return (
      <div className="screen active">
        <div className="card"><div className="loading">Loading approvals...</div></div>
      </div>
    );
  }

  const items = approvals.length > 0 ? approvals : DEMO_APPROVALS;

  return (
    <div className="screen active">
      {items.map((app, i) => (
        <div key={app.id || i} className="card approval-card">
          <div className="approval-head">
            <span className="approval-title">{app.title || app.name || 'Untitled'}</span>
            <span className={riskClass(app.risk)}>{app.risk || 'Unknown'} Risk</span>
          </div>
          <div className="approval-body">
            <p>{app.body || app.description || app.content || 'No details available.'}</p>
          </div>
          <div className="action-row">
            <button
              className="btn btn-ghost btn-approve"
              onClick={() => handleDecision(app.id, 'approve')}
              disabled={processingId === app.id}
            >
              ✓ Approve
            </button>
            <button
              className="btn btn-ghost btn-reject"
              onClick={() => handleDecision(app.id, 'reject')}
              disabled={processingId === app.id}
            >
              ✗ Reject
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="card">
          <div className="empty-state">No pending approvals.</div>
        </div>
      )}
    </div>
  );
}
