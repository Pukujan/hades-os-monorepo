import { useState, useCallback } from 'react';
import { listMinions } from '../api/hadesExtensionClient.js';

export default function WorkflowDetailPanel({ workflow, onToast, onBack }) {
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      await listMinions();
      onToast?.('Workflow queued successfully', 'success');
    } catch (err) {
      onToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  }, [onToast]);

  const desc = workflow?.description || workflow?.subtitle || 'No description available.';
  const diagram = workflow?.diagram || workflow?.mermaid || `flowchart TD\n  A[${workflow?.title || 'Workflow'}] --> B[Execute]\n  B --> C[Review]\n  C --> D[Complete]`;

  return (
    <div className="screen active">
      <button className="btn btn-ghost back-btn" onClick={onBack}>
        ← Back
      </button>
      <div className="card">
        <h3>{workflow?.title || workflow?.name || 'Workflow'}</h3>
        <div className="markdown-box">
          <p>{desc}</p>
        </div>
        <div className="mermaid-box">
          <pre>{diagram}</pre>
        </div>
        <div className="action-grid">
          <button className="btn btn-primary" onClick={handleRun} disabled={running}>
            {running ? 'Running...' : 'Run Workflow'}
          </button>
          <button className="btn btn-ghost">Edit</button>
        </div>
      </div>
    </div>
  );
}
