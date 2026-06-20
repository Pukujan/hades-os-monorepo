import React from "react";
import { useNavigate } from "react-router-dom";

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const WRAPPER_TAG_RE = /<\/?(?:pastor|hades|persona|reply|message|assistant|system|think|thought)[^>]*>/gi;

function stripXmlWrappers(text) {
  if (!text) return "";
  return String(text).replace(WRAPPER_TAG_RE, "").trim();
}

function renderMarkdown(text) {
  let html = escapeHtml(stripXmlWrappers(text));
  html = html
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^---+$/gm, "<hr>");

  const lines = html.split("\n");
  const out = [];
  let inList = false;

  for (const line of lines) {
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (ulMatch || olMatch) {
      const [, indent, content] = ulMatch || olMatch;
      const tag = ulMatch ? "ul" : "ol";
      if (!inList) { out.push(`<${tag}>`); inList = tag; }
      out.push(`<li>${content}</li>`);
    } else {
      if (inList) { out.push(`</${inList}>`); inList = false; }
      out.push(line ? `<p>${line}</p>` : "<br>");
    }
  }
  if (inList) out.push(`</${inList}>`);

  return out.join("\n");
}

export function ChatBubble({ message, showStamp = true, sendMessage, ProductCard, ComparisonCard }) {
  const navigate = useNavigate();
  const className = `bubble ${message.role === "user" ? "user" : "hades"} ${message.status === "queued" ? "pending" : ""}`;
  const onSendMessage = sendMessage;

  const mediaUrl = message.mediaUrl || message.gifUrl;
  const mediaType = message.mediaType || "";
  const mediaAlt = message.mediaAlt || "Media";
  const mediaStatus = message.mediaVerificationStatus;
  const attachments = message.attachments || [];

  function renderMedia() {
    if (!mediaUrl) return null;
    if (mediaStatus === "rejected") {
      return React.createElement("p", { key: "media-unavailable", className: "media-unavailable" }, "Media unavailable");
    }
    if (mediaType.startsWith("video/")) {
      return React.createElement("video", { key: "video", src: mediaUrl, controls: true, className: "chat-video", alt: mediaAlt });
    }
    if (mediaType.startsWith("audio/")) {
      return React.createElement("audio", { key: "audio", src: mediaUrl, controls: true, className: "chat-audio" });
    }
    if (mediaType.startsWith("image/") || !mediaType) {
      const isGif = /\.gif$/i.test(mediaUrl);
      return React.createElement("img", {
        key: "img",
        src: mediaUrl,
        alt: mediaAlt,
        className: isGif ? "chat-gif" : "chat-media",
        "data-testid": isGif ? "chat-gif" : undefined,
        onClick: () => window.open(mediaUrl, "_blank", "noopener,noreferrer")
      });
    }
    return React.createElement("a", { key: "download", href: mediaUrl, target: "_blank", rel: "noopener noreferrer", className: "chat-download" }, "Download file");
  }

  function renderAttachments() {
    if (!attachments.length) return null;
    return React.createElement("div", { className: "chat-attachment-list", key: "attachments" },
      attachments.map((att, i) => {
        const key = `att-${i}`;
        if (att.kind === "image" && att.url) {
          return React.createElement("img", {
            key, src: att.url, alt: att.name || "Image",
            className: "chat-media",
            onClick: () => window.open(att.url, "_blank", "noopener,noreferrer"),
          });
        }
        if (att.kind === "video" && att.url) {
          return React.createElement("video", { key, src: att.url, controls: true, className: "chat-video", alt: att.name });
        }
        if (att.kind === "audio" && att.url) {
          return React.createElement("audio", { key, src: att.url, controls: true, className: "chat-audio" });
        }
        return React.createElement("div", { key, className: "chat-attachment-card" },
          React.createElement("span", { className: "chat-attachment-card-icon" },
            att.kind === "document" ? "📄" : att.kind === "video" ? "🎬" : att.kind === "audio" ? "🎵" : "📎"
          ),
          React.createElement("span", { className: "chat-attachment-card-name" }, att.name || "file"),
          React.createElement("span", { className: "chat-attachment-card-size" },
            att.size ? `${(att.size / 1024).toFixed(1)} KB` : ""
          ),
          att.url
            ? React.createElement("a", { href: att.url, target: "_blank", rel: "noopener noreferrer", className: "chat-download", download: true }, "Download file")
            : null,
        );
      })
    );
  }

  return React.createElement("div", { className },
    React.createElement("span", { dangerouslySetInnerHTML: { __html: renderMarkdown(message.content) } }),
    showStamp ? React.createElement("span", { className: "stamp", key: "stamp" }, message.createdAt || "Just now") : null,
    message.status === "queued" ? React.createElement("small", { key: "pending" }, "Pending sync") : null,
    renderMedia(),
    renderAttachments(),
    message.cards?.length > 0 ? React.createElement("div", { className: "hades-message-cards", key: "cards" },
      message.cards.map((card, i) => {
        if (card.type === "product_result" && ProductCard) return React.createElement(ProductCard, { key: `card-${i}`, card });
        if (card.type === "comparison_row" && ComparisonCard) return React.createElement(ComparisonCard, { key: `card-${i}`, card });
        return null;
      })
    ) : null,
    message.actions?.length > 0 ? React.createElement("div", { className: "hades-message-actions", key: "actions" },
      message.actions.map((action, i) => {
        if (action.type === "route") {
          return React.createElement("button", { key: `action-${i}`, type: "button", className: "hades-action-button", onClick: () => navigate(action.to) }, action.label);
        }
        if (action.type === "external_link") {
          return React.createElement("a", { key: `action-${i}`, className: "hades-action-button", href: action.url, target: "_blank", rel: "noreferrer noopener" }, action.label);
        }
        if (action.type === "command") {
          return React.createElement("button", { key: `action-${i}`, type: "button", className: "hades-action-button", onClick: () => onSendMessage(`/${action.command}`) }, action.label);
        }
        return null;
      })
    ) : null
  );
}
