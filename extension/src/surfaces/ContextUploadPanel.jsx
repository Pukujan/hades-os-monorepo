import { useState, useEffect } from 'react';
import { listDocuments, saveDocumentFromText } from '../api/hadesExtensionClient.js';

const DEMO_DOCUMENTS = [
  { id: 'doc-1', name: 'Q1 Brand Guidelines', textContent: 'Brand guidelines for Q1...', size: 2048 },
  { id: 'doc-2', name: 'Product Launch Copy', textContent: 'Product launch content...', size: 4096 },
];

export default function ContextUploadPanel({ onToast }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocuments()
      .then((data) => setDocuments(Array.isArray(data) ? data : data.documents || []))
      .catch(() => setDocuments(DEMO_DOCUMENTS))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !content.trim() || saving) return;
    setSaving(true);
    setProgress(30);
    try {
      await saveDocumentFromText({ name: name.trim(), textContent: content.trim() });
      setProgress(100);
      onToast?.('Document saved successfully', 'success');
      setName('');
      setContent('');
      const data = await listDocuments().catch(() => null);
      if (data) setDocuments(Array.isArray(data) ? data : data.documents || []);
      setTimeout(() => setProgress(0), 1500);
    } catch (err) {
      onToast?.(`Error: ${err.message}`, 'error');
      setProgress(0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen active">
      <div className="card">
        <h3>Upload Context</h3>
        <div className="field">
          <label>Name</label>
          <input
            type="text"
            className="input"
            placeholder="Document name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Content</label>
          <textarea
            className="textarea"
            placeholder="Paste your content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
        </div>
        {progress > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        <div className="action-row">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <h4>Saved Documents</h4>
        {loading && <div className="loading">Loading documents...</div>}
        {!loading && documents.length === 0 && (
          <div className="empty-state">No documents yet.</div>
        )}
        {!loading && documents.map((doc, i) => (
          <div key={doc.id || i} className="list-item">
            <div className="li-title">{doc.name || 'Untitled'}</div>
            <div className="li-sub">{doc.textContent ? `${doc.textContent.substring(0, 60)}...` : `${doc.size || 0} bytes`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
