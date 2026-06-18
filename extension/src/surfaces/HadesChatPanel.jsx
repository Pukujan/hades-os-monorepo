import { useState, useRef } from 'react';
import { sendChatMessage } from '../api/hadesExtensionClient.js';

export default function HadesChatPanel({ onToast }) {
  const [messages, setMessages] = useState([
    { role: 'hades', text: 'Connected. Ask me anything about your workflows.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const data = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: 'hades', text: data.response || data.message || data.text || JSON.stringify(data) }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'hades', text: `Error: ${err.message}` }]);
      onToast?.(err.message, 'error');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="screen active">
        <div className="card chat-window">
          {messages.length === 0 && !loading && (
            <div className="empty-state">No messages yet. Start a conversation.</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`bubble ${msg.role}`}>{msg.text}</div>
          ))}
          {loading && <div className="bubble hades typing">Typing...</div>}
        </div>
        <div className="composer">
          <input
            ref={inputRef}
            type="text"
            className="input"
            placeholder="Ask Hades anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={loading}>
            →
          </button>
        </div>
      </div>
    </>
  );
}
