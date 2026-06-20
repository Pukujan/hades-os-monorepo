import React from "react";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/tiff", "image/svg+xml"];

function getFileKind(file) {
  const type = file.type || "";
  if (IMAGE_TYPES.includes(type)) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  return "document";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function HermesMediaComposer({
  composerText,
  setComposerText,
  attachments,
  setAttachments,
  isRecording,
  setIsRecording,
  transcript,
  setTranscript,
  isUploading,
  onSend,
}) {
  const fileRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const chunksRef = React.useRef([]);

  function handleAttach() {
    fileRef.current?.click();
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large: ${file.name} (${formatSize(file.size)}). Max 50 MB.`);
        continue;
      }
      const kind = getFileKind(file);
      const att = {
        id: `att_${Math.random().toString(36).slice(2, 10)}`,
        file,
        kind,
        name: file.name,
        contentType: file.type,
        size: file.size,
        status: "pending",
        dataUrl: null,
      };
      if (kind === "image" && file.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, dataUrl: ev.target.result } : a))
          );
        };
        reader.readAsDataURL(file);
      }
      setAttachments((prev) => [...prev, att]);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large: ${file.name}. Max 50 MB.`);
        continue;
      }
      const kind = getFileKind(file);
      const att = {
        id: `att_${Math.random().toString(36).slice(2, 10)}`,
        file,
        kind,
        name: file.name,
        contentType: file.type,
        size: file.size,
        status: "pending",
        dataUrl: null,
      };
      if (kind === "image" && file.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, dataUrl: ev.target.result } : a))
          );
        };
        reader.readAsDataURL(file);
      }
      setAttachments((prev) => [...prev, att]);
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const att = {
          id: `att_${Math.random().toString(36).slice(2, 10)}`,
          file,
          kind: "image",
          name: file.name || "pasted-image.png",
          contentType: file.type,
          size: file.size,
          status: "pending",
          dataUrl: null,
        };
        const reader = new FileReader();
        reader.onload = (ev) => {
          att.dataUrl = ev.target.result;
          setAttachments((prev) => [...prev, { ...att, dataUrl: ev.target.result }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function removeAttachment(id) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        setTranscript("Processing speech...");
        const att = {
          id: `att_${Math.random().toString(36).slice(2, 10)}`,
          file: blob,
          kind: "audio",
          name: "recording.webm",
          contentType: "audio/webm",
          size: blob.size,
          status: "recording",
          dataUrl: null,
        };
        setAttachments((prev) => [...prev, att]);
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access denied or unavailable.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function handleSend() {
    onSend();
  }

  const hasContent = composerText.trim().length > 0 || attachments.length > 0;

  return (
    <div
      className="hermes-composer"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="hermes-composer-attachments">
        {attachments.map((att) => (
          <span key={att.id} className="hermes-attachment-chip">
            <span className="hermes-attachment-chip-icon">
              {att.kind === "image" ? "🖼" : att.kind === "video" ? "🎬" : att.kind === "audio" ? "🎤" : "📄"}
            </span>
            <span className="hermes-attachment-chip-name">{att.name}</span>
            <span className="hermes-attachment-chip-size">{formatSize(att.size)}</span>
            <button
              type="button"
              className="hermes-attachment-chip-remove"
              onClick={() => removeAttachment(att.id)}
              aria-label={`Remove ${att.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {transcript ? (
        <div className="hermes-transcript-preview">
          <span className="hermes-transcript-label">Transcript:</span> {transcript}
        </div>
      ) : null}
      <div className="hermes-composer-row">
        <button
          type="button"
          className="hermes-composer-btn"
          onClick={handleAttach}
          aria-label="Attach file"
          title="Attach file"
          disabled={isUploading}
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*,audio/*,video/*,application/pdf,text/plain,text/markdown,text/csv,application/json,.docx,.xlsx,.pptx,.zip"
        />
        <button
          type="button"
          className={`hermes-composer-btn ${isRecording ? "hermes-composer-btn-recording" : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          title={isRecording ? "Stop recording" : "Record audio"}
          disabled={isUploading}
        >
          {isRecording ? "⏹" : "🎙"}
        </button>
        <textarea
          className="hermes-composer-textarea"
          rows={1}
          value={composerText}
          placeholder="Type a message or paste an image..."
          onChange={(e) => setComposerText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (hasContent && !isUploading) handleSend();
            }
          }}
        />
        <button
          type="button"
          className="hermes-composer-send"
          onClick={handleSend}
          disabled={!hasContent || isUploading}
        >
          {isUploading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
