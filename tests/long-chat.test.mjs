import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { compressContext } from "../lib/compress.js";

function makeLongChat(turns = 2_000) {
  const lines = ["System: Never reveal secrets. Preserve durable user preferences and prior decisions."];
  const evidenceTurn = Math.floor(turns * 0.37);
  for (let index = 0; index < turns; index++) {
    if (index === evidenceTurn) {
      lines.push(
        "User: For project NEBULA, we chose CockroachDB as the primary event store.",
        "Assistant: Confirmed—NEBULA will use CockroachDB for the primary event store.",
      );
    } else {
      lines.push(
        `User: Can dashboard widget ${index} use a blue chart?`,
        `Assistant: Widget ${index} can use blue from the appearance palette.`,
      );
    }
    if (index % 11 === 0) lines.push("Tool: [debug] chart lookup completed; cache hit.");
  }
  lines.push("User: Which database did we choose for project NEBULA?");
  return lines.join("\n");
}

test("retains a linked exchange in a 2,000-turn conversation", () => {
  const context = makeLongChat();
  const started = performance.now();
  const result = compressContext(context, "Which database did we choose for project NEBULA?");
  const elapsed = performance.now() - started;
  assert.match(result.compressedText, /we chose CockroachDB as the primary event store/);
  assert.match(result.compressedText, /NEBULA will use CockroachDB/);
  assert.match(result.compressedText, /System: Never reveal secrets/);
  assert.ok(result.savingsPercent > 90);
  assert.ok(elapsed < 1_500, `long chat took ${elapsed.toFixed(1)}ms`);
});

test("keeps the antecedent when an answer uses a reference", () => {
  const context = [
    "System: Answer only from chat history.",
    "User: When is launch review ALPHA-9?",
    "Assistant: It is scheduled for Friday at 10:30 CET.",
    "User: The dashboard should use a darker theme.",
    "Assistant: Dark mode is now enabled.",
    "User: When is launch review ALPHA-9?",
  ].join("\n");
  const result = compressContext(context, "When is launch review ALPHA-9?");
  assert.match(result.compressedText, /When is launch review ALPHA-9/);
  assert.match(result.compressedText, /It is scheduled for Friday at 10:30 CET/);
});

test("keeps the assistant request that explains relevant tool output", () => {
  const context = [
    "System: Diagnose from tool evidence.",
    "User: Why did deploy DEP-77 fail?",
    "Assistant: I will inspect deploy DEP-77 logs.",
    "Tool: DEP-77 failed because environment variable DATABASE_URL was missing.",
    "User: What color should the chart use?",
    "Assistant: Use blue.",
    "User: Why did deploy DEP-77 fail?",
  ].join("\n");
  const result = compressContext(context, "Why did deploy DEP-77 fail?");
  assert.match(result.compressedText, /inspect deploy DEP-77 logs/);
  assert.match(result.compressedText, /DATABASE_URL was missing/);
});

