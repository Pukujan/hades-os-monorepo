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
  const clean = stripXmlWrappers(text);
  const html = escapeHtml(clean);
  return html
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

export function ChatBubble({ message, showStamp = true, sendMessage, ProductCard, ComparisonCard }) {
  const navigate = useNavigate();
  const className = `bubble ${message.role === "user" ? "user" : "hades"} ${message.status === "queued" ? "pending" : ""}`;
  const onSendMessage = sendMessage;

  const gifUrl = message.gifUrl || message.mediaUrl;
  const gifStatus = message.mediaVerificationStatus;
  const gifAlt = message.mediaAlt || "GIF media";

  return React.createElement("div", { className },
    React.createElement("span", { dangerouslySetInnerHTML: { __html: renderMarkdown(message.content) } }),
    showStamp ? React.createElement("span", { className: "stamp", key: "stamp" }, message.createdAt || "Just now") : null,
    message.status === "queued" ? React.createElement("small", { key: "pending" }, "Pending sync") : null,
    gifUrl && gifStatus === "verified" ? React.createElement("img", { key: "gif", "data-testid": "chat-gif", src: gifUrl, alt: gifAlt, className: "chat-gif" }) : null,
    gifUrl && gifStatus === "rejected" ? React.createElement("p", { key: "gif-unavailable", className: "gif-unavailable" }, "GIF media unavailable") : null,
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
