import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiKey, setApiKey, listWorkflows, listApprovals } from '../api/hadesExtensionClient.js';
import HadesChatPanel from './HadesChatPanel.jsx';
import WorkflowListPanel from './WorkflowListPanel.jsx';
import WorkflowDetailPanel from './WorkflowDetailPanel.jsx';
import ContextUploadPanel from './ContextUploadPanel.jsx';
import TextContextSpacesPanel from './TextContextSpacesPanel.jsx';
import PageCapturePanel from './PageCapturePanel.jsx';
import ApprovalQueuePanel from './ApprovalQueuePanel.jsx';

export function HadesExtensionApp() {
  const [apiReady, setApiReady] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('connect');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [toast, setToast] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const keyInputRef = useRef(null);

  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        setApiReady(true);
        setCurrentScreen('chat');
      } else {
        setApiReady(false);
      }
    });
  }, []);

  const refreshBadges = useCallback(() => {
    listWorkflows().then((data) => setWorkflows(Array.isArray(data) ? data : data.workflows || [])).catch(() => {});
    listApprovals().then((data) => setApprovals(Array.isArray(data) ? data : data.approvals || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (apiReady) refreshBadges();
  }, [apiReady, refreshBadges]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleConnect = useCallback(() => {
    const val = keyInputRef.current?.value?.trim();
    if (!val) return;
    setApiKey(val).then(() => {
      setApiReady(true);
      setCurrentScreen('chat');
      showToast('Connected to Hades', 'success');
    });
  }, [showToast]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleConnect();
  }, [handleConnect]);

  const handleDisconnect = useCallback(() => {
    setApiKey('').then(() => {
      setApiReady(false);
      setCurrentScreen('connect');
    });
  }, []);

  const getActiveTab = () => {
    switch (currentScreen) {
      case 'chat': return 'chat';
      case 'workflows':
      case 'workflow-detail': return 'workflows';
      case 'upload':
      case 'textspaces':
      case 'capture': return 'capture';
      case 'approvals': return 'approvals';
      default: return 'chat';
    }
  };
  const activeTab = getActiveTab();

  if (apiReady === null) {
    return <div className="scan-line"><div className="loading">Initializing...</div></div>;
  }

  if (!apiReady) {
    return (
      <div className="scan-line">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        <div className="screen connect active" style={{ display: 'flex' }}>
          <div className="card connect-card">
            <div className="connect-icon">⚡</div>
            <h2>Connect to Hades</h2>
            <p className="connect-sub">Enter your API key to get started</p>
            <div className="field">
              <input
                ref={keyInputRef}
                type="password"
                className="input"
                placeholder="sk-hades-..."
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="action-row">
              <button className="btn btn-primary" onClick={handleConnect}>
                Connect
              </button>
              <button className="btn btn-ghost">Learn More</button>
            </div>
            <p className="connect-foot">Your key is stored locally and never shared.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-line device">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="top-bar">
        <div className="brand">⚡ HADES</div>
        <div className="icon-row">
          <span className="status-dot" title="Connected">●</span>
          <button className="btn-icon" onClick={handleDisconnect} title="Disconnect">⚙</button>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab${activeTab === 'chat' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('chat')}
        >
          Chat
        </button>
        <button
          className={`tab${activeTab === 'workflows' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('workflows')}
        >
          Workflows
        </button>
        <button
          className={`tab${activeTab === 'capture' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('capture')}
        >
          Capture
        </button>
        <button
          className={`tab${activeTab === 'approvals' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('approvals')}
        >
          Approvals{approvals.length > 0 ? ` (${approvals.length})` : ''}
        </button>
      </div>

      <div className="screens">
        {currentScreen === 'chat' && <HadesChatPanel onToast={showToast} />}
        {currentScreen === 'workflows' && (
          <WorkflowListPanel
            onToast={showToast}
            onSelectWorkflow={(wf) => {
              setSelectedWorkflow(wf);
              setCurrentScreen('workflow-detail');
            }}
          />
        )}
        {currentScreen === 'workflow-detail' && (
          <WorkflowDetailPanel
            workflow={selectedWorkflow}
            onToast={showToast}
            onBack={() => setCurrentScreen('workflows')}
          />
        )}
        {currentScreen === 'upload' && <ContextUploadPanel onToast={showToast} />}
        {currentScreen === 'textspaces' && <TextContextSpacesPanel onToast={showToast} />}
        {currentScreen === 'capture' && <PageCapturePanel onToast={showToast} />}
        {currentScreen === 'approvals' && (
          <ApprovalQueuePanel
            onToast={showToast}
            onApprovalChange={refreshBadges}
          />
        )}
      </div>

      <nav className="bottom-nav">
        <button
          className={`nav-item${currentScreen === 'chat' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('chat')}
        >
          <span className="nav-icon">💬</span>
          <span className="nav-label">CHAT</span>
        </button>
        <button
          className={`nav-item${currentScreen === 'workflows' || currentScreen === 'workflow-detail' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('workflows')}
        >
          <span className="nav-icon">⚙</span>
          <span className="nav-label">MINIONS</span>
        </button>
        <button
          className={`nav-item${currentScreen === 'upload' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('upload')}
        >
          <span className="nav-icon">📤</span>
          <span className="nav-label">UPLOAD</span>
        </button>
        <button
          className={`nav-item${currentScreen === 'textspaces' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('textspaces')}
        >
          <span className="nav-icon">📄</span>
          <span className="nav-label">SPACES</span>
        </button>
        <button
          className={`nav-item${currentScreen === 'approvals' ? ' active' : ''}`}
          onClick={() => setCurrentScreen('approvals')}
        >
          <span className="nav-icon">✓</span>
          <span className="nav-label">APPROVE{approvals.length > 0 ? ` (${approvals.length})` : ''}</span>
        </button>
      </nav>
    </div>
  );
}
