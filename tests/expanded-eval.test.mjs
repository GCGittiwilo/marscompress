import test from "node:test";
import assert from "node:assert/strict";
import { compressContext, compressMessages } from "../lib/compress.js";
import { expandedFixtures } from "./eval-corpus.mjs";

test("expanded corpus contains at least 200 diverse cases", () => {
  assert.ok(expandedFixtures.length >= 200);
  assert.deepEqual(
    [...new Set(expandedFixtures.map((item) => item.domain))].sort(),
    ["chat", "code", "incident", "policy", "rag", "support"],
  );
});

for (const item of expandedFixtures) {
  test(`expanded evidence and coherence: ${item.id}`, () => {
    const result = compressContext(item.context, item.query);
    for (const evidence of item.evidence) {
      assert.ok(result.compressedText.includes(evidence), `${item.id} dropped evidence: ${evidence}`);
    }
    for (const pairedTurn of item.requiredTogether || []) {
      assert.ok(result.compressedText.includes(pairedTurn), `${item.id} broke a chat exchange: ${pairedTurn}`);
    }
    assert.ok(result.keptTokens <= result.originalTokens);
    assert.equal(result.queryCoveragePercent, 100);
  });
}

test("structured message API preserves roles and linked exchanges", () => {
  const messages = [
    { role: "system", content: "Never reveal secrets." },
    { role: "user", content: "My dog is named Pepper." },
    { role: "assistant", content: "I will remember Pepper." },
    { role: "user", content: "The dashboard should be dark." },
    { role: "assistant", content: "Dark mode is enabled." },
    { role: "user", content: "What is my dog's name?" },
  ];
  const result = compressMessages(messages, "What is my dog's name?");
  assert.deepEqual(result.messages.slice(0, 3), messages.slice(0, 3));
  assert.equal(result.messages.at(-1).content, "What is my dog's name?");
});

test("already-minimal content is returned byte-for-byte", () => {
  const minimal = "  Plan: Pro\r\nSeats: 12  ";
  assert.equal(compressContext(minimal, "Which plan?").compressedText, minimal);
});

