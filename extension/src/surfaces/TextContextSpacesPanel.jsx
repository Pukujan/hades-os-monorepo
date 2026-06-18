import { useState, useEffect } from 'react';
import { listContextSpaces, saveTextContext } from '../api/hadesExtensionClient.js';

const DEMO_SPACES = [
  { id: 'space-1', name: 'Profile Bio', content: 'Instagram bio text and variations.', updatedAt: '2026-06-17' },
  { id: 'space-2', name: 'Brand Voice', content: 'Tone and style guidelines for social posts.', updatedAt: '2026-06-16' },
];

export default function TextContextSpacesPanel({ onToast }) {
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listContextSpaces()
      .then((data) => setSpaces(Array.isArray(data) ? data : data.spaces || []))
      .catch(() => setSpaces(DEMO_SPACES))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (space) => {
    setSelectedSpace(space);
    setEditContent(space.content || '');
  };

  const handleSave = async () => {
    if (!selectedSpace || saving) return;
    setSaving(true);
    try {
      await saveTextContext(selectedSpace.name, editContent);
      onToast?.('Context space updated', 'success');
      setSelectedSpace((prev) => ({ ...prev, content: editContent }));
      const data = await listContextSpaces().catch(() => null);
      if (data) setSpaces(Array.isArray(data) ? data : data.spaces || []);
    } catch (err) {
      onToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (selectedSpace) {
      setEditContent(selectedSpace.content || '');
    }
  };

  return (
    <div className="screen active">
      <div className="card">
        {loading && <div className="loading">Loading spaces...</div>}
        {!loading && spaces.length === 0 && (
          <div className="empty-state">No context spaces yet.</div>
        )}
        {!loading && spaces.map((space, i) => (
          <div
            key={space.id || i}
            className={`list-item${selectedSpace?.id === space.id ? ' active' : ''}`}
            onClick={() => handleSelect(space)}
          >
            <div className="li-title">{space.name || 'Untitled'}</div>
            <div className="li-sub">{space.content ? `${space.content.substring(0, 50)}...` : 'Empty'}</div>
          </div>
        ))}
      </div>

      {selectedSpace && (
        <div className="card">
          <h4>{selectedSpace.name}</h4>
          <textarea
            className="textarea"
            placeholder="Edit space content..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
          />
          <div className="mini-card">
            {editContent ? editContent.substring(0, 120) : 'Preview will appear here...'}
          </div>
          <div className="action-row">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-ghost" onClick={handleDiscard}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
