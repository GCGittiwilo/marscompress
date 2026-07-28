import { performance } from "node:perf_hooks";
import { compressContext, estimateTokens, segmentContext, tokenizeText } from "../lib/compress.js";
import { fixtures } from "../tests/fixtures.mjs";
import { expandedFixtures } from "../tests/eval-corpus.mjs";

const corpus = [...fixtures, ...expandedFixtures];

function truncateByCharacters(context, ratio, direction) {
  const length = Math.max(1, Math.floor(context.length * ratio));
  return direction === "head" ? context.slice(0, length) : context.slice(-length);
}

function keywordBaseline(context, query, ratio) {
  const queryTerms = new Set(tokenizeText(query));
  const blocks = segmentContext(context);
  const ranked = blocks
    .map((text, index) => ({
      index,
      text,
      score: tokenizeText(text).filter((term) => queryTerms.has(term)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const target = estimateTokens(context) * ratio;
  const kept = new Set();
  let tokens = 0;
  for (const block of ranked) {
    if (tokens >= target) break;
    kept.add(block.index);
    tokens += estimateTokens(block.text);
  }
  return blocks.filter((_, index) => kept.has(index)).join("\n\n");
}

const candidates = [
  { name: "head-35", run: (item) => truncateByCharacters(item.context, 0.35, "head") },
  { name: "tail-35", run: (item) => truncateByCharacters(item.context, 0.35, "tail") },
  { name: "keyword-35", run: (item) => keywordBaseline(item.context, item.query, 0.35) },
  ...["precision", "balanced", "frontier"].map((policy) => ({
    name: `mars-${policy}`,
    run: (item) => compressContext(item.context, item.query, { policy }).compressedText,
  })),
];

const rows = [];
for (const candidate of candidates) {
  let evidenceKept = 0;
  let evidenceTotal = 0;
  let pairsKept = 0;
  let pairsTotal = 0;
  const savings = [];
  const latencies = [];

  for (const item of corpus) {
    const started = performance.now();
    const output = candidate.run(item);
    latencies.push(performance.now() - started);
    for (const evidence of item.evidence) {
      evidenceTotal++;
      if (output.includes(evidence)) evidenceKept++;
    }
    for (const turn of item.requiredTogether || []) {
      pairsTotal++;
      if (output.includes(turn)) pairsKept++;
    }
    const before = estimateTokens(item.context);
    const after = estimateTokens(output);
    savings.push(((before - after) / before) * 100);
  }

  savings.sort((a, b) => a - b);
  latencies.sort((a, b) => a - b);
  rows.push({
    policy: candidate.name,
    recall: (evidenceKept / evidenceTotal) * 100,
    coherence: pairsTotal ? (pairsKept / pairsTotal) * 100 : 100,
    savings: savings[Math.floor(savings.length / 2)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
  });
}

function dominates(a, b) {
  const noWorse =
    a.recall >= b.recall - 1 &&
    a.coherence >= b.coherence - 1 &&
    a.savings >= b.savings - 1 &&
    a.p95 <= b.p95 * 1.05;
  const strictlyBetter =
    a.recall >= b.recall + 1 ||
    a.coherence >= b.coherence + 1 ||
    a.savings >= b.savings + 1 ||
    a.p95 <= b.p95 * 0.95;
  return noWorse && strictlyBetter;
}

for (const row of rows) {
  row.frontier = rows.some((other) => other !== row && dominates(other, row)) ? "dominated" : "frontier";
}

console.table(rows.map((row) => ({
  policy: row.policy,
  "evidence recall %": row.recall.toFixed(2),
  "pair coherence %": row.coherence.toFixed(2),
  "median removed %": row.savings.toFixed(1),
  "p95 ms": row.p95.toFixed(3),
  status: row.frontier,
})));

const balanced = rows.find((row) => row.policy === "mars-frontier");
if (
  !balanced ||
  balanced.recall < 99 ||
  balanced.coherence < 100 ||
  balanced.savings < 55 ||
  balanced.frontier !== "frontier"
) {
  process.exitCode = 1;
}
