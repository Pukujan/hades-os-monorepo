import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeChatCards } from "../../services/chatCards.js";

test("allows product result cards", () => {
  const result = normalizeChatCards([
    {
      type: "product_result",
      title: "Nike Pegasus 39",
      price: "$63",
      seller: "Amazon",
      condition: "New with tags",
      size: "US 9.5 / EU 42",
      width: "Medium",
      url: "https://www.amazon.com/",
    },
  ]);

  assert.deepEqual(result, [
    {
      type: "product_result",
      title: "Nike Pegasus 39",
      price: "$63",
      seller: "Amazon",
      condition: "New with tags",
      size: "US 9.5 / EU 42",
      width: "Medium",
      url: "https://www.amazon.com/",
    },
  ]);
});

test("drops unsafe product URLs", () => {
  const result = normalizeChatCards([
    {
      type: "product_result",
      title: "Bad Listing",
      url: "javascript:alert(1)",
    },
  ]);

  assert.deepEqual(result, [
    {
      type: "product_result",
      title: "Bad Listing",
    },
  ]);
});

test("allows comparison row cards", () => {
  const result = normalizeChatCards([
    {
      type: "comparison_row",
      title: "Pegasus 39",
      fields: [
        { label: "Price", value: "$63" },
        { label: "Seller", value: "Amazon" },
      ],
    },
  ]);

  assert.deepEqual(result, [
    {
      type: "comparison_row",
      title: "Pegasus 39",
      fields: [
        { label: "Price", value: "$63" },
        { label: "Seller", value: "Amazon" },
      ],
    },
  ]);
});

test("limits cards to six", () => {
  const result = normalizeChatCards(
    Array.from({ length: 10 }, (_, i) => ({
      type: "product_result",
      title: `Product ${i}`,
    }))
  );

  assert.equal(result.length, 6);
});
