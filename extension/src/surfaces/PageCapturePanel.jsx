import { useState } from 'react';
import { capturePage } from '../api/hadesExtensionClient.js';

export default function PageCapturePanel({ onToast }) {
  const [url, setUrl] = useState('');
  const [locked, setLocked] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(null);

  const handleCapture = async () => {
    if (!url.trim() || capturing) return;
    setCapturing(true);
    try {
      const pageData = { url: url.trim(), locked, capturedAt: new Date().toISOString() };
      const result = await capturePage(pageData);
      setCaptured(result);
      onToast?.('Page captured successfully', 'success');
    } catch (err) {
      onToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="screen active">
      <div className="card">
        <div className="capture-preview">
          <div className="capture-head">
            {captured ? (
              <div className="placeholder-img" style={{ background: '#0d1f0d', padding: '20px', borderRadius: '14px' }}>
                ✓ Captured: {url.substring(0, 40)}...
              </div>
            ) : (
              <div className="placeholder-img">
                📸 Capture Preview
              </div>
            )}
          </div>
          <div className="field-row">
            <div className="field">
              <label>URL</label>
              <input
                type="text"
                className="input"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={capturing}
              />
            </div>
            <button
              className="btn btn-icon"
              onClick={() => setLocked(!locked)}
              title={locked ? 'Unlock URL' : 'Lock URL'}
            >
              {locked ? '🔒' : '🔓'}
            </button>
          </div>
        </div>
        <div className="action-row">
          <button className="btn btn-primary" onClick={handleCapture} disabled={capturing}>
            {capturing ? 'Capturing...' : 'Capture Page'}
          </button>
        </div>
      </div>
    </div>
  );
}
