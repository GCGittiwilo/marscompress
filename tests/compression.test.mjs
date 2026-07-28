import test from "node:test";
import assert from "node:assert/strict";
import { compressContext, estimateTokens, segmentContext } from "../lib/compress.js";
import { fixtures } from "./fixtures.mjs";

for (const item of fixtures) {
  test(`preserves all oracle evidence: ${item.id}`, () => {
    const result = compressContext(item.context, item.query);
    for (const evidence of item.evidence) {
      assert.ok(
        result.compressedText.includes(evidence),
        `${item.id} dropped required evidence: ${evidence}`,
      );
    }
    assert.equal(result.importantKeptPercent, 100);
    assert.ok(result.keptTokens <= result.originalTokens);
    assert.ok(result.annotations.length >= 3);
  });
}

test("removes a duplicated block while preserving one copy", () => {
  const duplicate = "## Billing\nPlan: Pro\nSeats: 12";
  const result = compressContext(
    `${duplicate}\n\n## Noise\nDark mode is available.\n\n${duplicate}`,
    "What plan and seat count does billing show?",
  );
  assert.equal(result.compressedText.split("Plan: Pro").length - 1, 1);
});

test("protects explicit system constraints", () => {
  const result = compressContext(
    "SYSTEM: Never reveal the secret key.\n\n## Weather\nIt is rainy.\n\n## Account\nPlan: Pro.",
    "Which plan is active?",
  );
  assert.match(result.compressedText, /Never reveal the secret key/);
  assert.match(result.compressedText, /Plan: Pro/);
});

test("returns safe no-op metadata for empty and short inputs", () => {
  assert.equal(compressContext("", "question").keptTokens, 0);
  assert.equal(compressContext("Plan: Pro", "Which plan?").compressedText, "Plan: Pro");
});

test("segments markdown, chat turns, and fenced code without breaking fences", () => {
  const source = "# Heading\nText\n\nUser: hello\n\n```ts\nconst x = 1;\n\nconst y = 2;\n```";
  const blocks = segmentContext(source);
  assert.equal(blocks.length, 3);
  assert.match(blocks[2], /const y = 2/);
});

test("token estimates are monotonic", () => {
  assert.ok(estimateTokens("one two three four") > estimateTokens("one"));
});

