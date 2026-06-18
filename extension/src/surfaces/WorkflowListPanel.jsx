import { useState, useEffect } from 'react';
import { listWorkflows } from '../api/hadesExtensionClient.js';

const DEMO_WORKFLOWS = [
  { id: 'wf-1', title: 'Daily Content Review', subtitle: 'Review and approve social posts', meta: ['Active', '3 tasks'] },
  { id: 'wf-2', title: 'Brand Monitor', subtitle: 'Track brand mentions across platforms', meta: ['Idle', 'Scheduled'] },
  { id: 'wf-3', title: 'Competitor Analysis', subtitle: 'Weekly competitor report generation', meta: ['Draft'] },
  { id: 'wf-4', title: 'Post Scheduler', subtitle: 'Auto-schedule content across timezones', meta: ['Active', '12 tasks'] },
];

export default function WorkflowListPanel({ onToast, onSelectWorkflow }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWorkflows()
      .then((data) => setWorkflows(Array.isArray(data) ? data : data.workflows || []))
      .catch(() => setWorkflows(DEMO_WORKFLOWS))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="screen active">
        <div className="card"><div className="loading">Loading workflows...</div></div>
      </div>
    );
  }

  const items = workflows.length > 0 ? workflows : DEMO_WORKFLOWS;

  return (
    <div className="screen active">
      <div className="card">
        {items.map((wf, i) => (
          <div
            key={wf.id || i}
            className="list-item"
            onClick={() => onSelectWorkflow?.(wf)}
          >
            <div className="li-title">{wf.title || wf.name || 'Untitled'}</div>
            <div className="li-sub">{wf.subtitle || wf.description || ''}</div>
            {(wf.meta || wf.tags) && (
              <div className="li-meta">
                {(wf.meta || wf.tags || []).map((tag, j) => (
                  <span key={j} className="chip">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="empty-state">No workflows found.</div>
        )}
      </div>
    </div>
  );
}
