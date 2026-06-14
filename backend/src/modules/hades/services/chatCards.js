function cleanText(value, max = 120) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

function isSafeHttpsUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeChatCards(cards = []) {
  if (!Array.isArray(cards)) return [];

  return cards
    .map((card) => {
      if (!card || typeof card !== "object") return null;

      if (card.type === "product_result") {
        const title = cleanText(card.title, 80);
        if (!title) return null;

        const normalized = {
          type: "product_result",
          title,
          ...(card.price ? { price: cleanText(card.price, 40) } : {}),
          ...(card.seller ? { seller: cleanText(card.seller, 60) } : {}),
          ...(card.condition ? { condition: cleanText(card.condition, 60) } : {}),
          ...(card.size ? { size: cleanText(card.size, 40) } : {}),
          ...(card.width ? { width: cleanText(card.width, 40) } : {}),
          ...(card.notes ? { notes: cleanText(card.notes, 180) } : {}),
          ...(card.confidence ? { confidence: cleanText(card.confidence, 20) } : {}),
          ...(card.checkedAt ? { checkedAt: cleanText(card.checkedAt, 40) } : {}),
        };

        if (card.url && isSafeHttpsUrl(card.url)) {
          normalized.url = card.url;
        }

        return normalized;
      }

      if (card.type === "comparison_row") {
        const title = cleanText(card.title, 80);
        if (!title) return null;

        const fields = Array.isArray(card.fields)
          ? card.fields
              .map((field) => ({
                label: cleanText(field.label, 40),
                value: cleanText(field.value, 100),
              }))
              .filter((field) => field.label && field.value)
              .slice(0, 6)
          : [];

        if (!fields.length) return null;

        const normalized = {
          type: "comparison_row",
          title,
          fields,
        };

        if (card.url && isSafeHttpsUrl(card.url)) {
          normalized.url = card.url;
        }

        return normalized;
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 6);
}
