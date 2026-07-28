import { performance } from "node:perf_hooks";
import { compressContext } from "../lib/compress.js";
import { fixtures } from "../tests/fixtures.mjs";
import { expandedFixtures } from "../tests/eval-corpus.mjs";

const corpus = [...fixtures, ...expandedFixtures];
const rows = [];

for (const item of corpus) {
  const runs = [];
  let result;
  for (let index = 0; index < 10; index++) {
    const started = performance.now();
    result = compressContext(item.context, item.query);
    runs.push(performance.now() - started);
  }
  const evidenceKept = item.evidence.filter((value) => result.compressedText.includes(value)).length;
  const pairTurns = item.requiredTogether || [];
  const pairTurnsKept = pairTurns.filter((value) => result.compressedText.includes(value)).length;
  rows.push({
    case: item.id,
    domain: item.domain,
    recall: evidenceKept / item.evidence.length,
    coherence: pairTurns.length ? pairTurnsKept / pairTurns.length : 1,
    removed: result.savingsPercent,
    medianMs: runs.sort((a, b) => a - b)[Math.floor(runs.length / 2)],
  });
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const domains = [...new Set(rows.map((row) => row.domain))];
console.table(domains.map((domain) => {
  const domainRows = rows.filter((row) => row.domain === domain);
  return {
    domain,
    cases: domainRows.length,
    "recall %": (domainRows.reduce((sum, row) => sum + row.recall, 0) / domainRows.length * 100).toFixed(1),
    "coherence %": (domainRows.reduce((sum, row) => sum + row.coherence, 0) / domainRows.length * 100).toFixed(1),
    "median removed %": median(domainRows.map((row) => row.removed)).toFixed(1),
    "median ms": median(domainRows.map((row) => row.medianMs)).toFixed(3),
  };
}));

const oracleRecall = rows.reduce((sum, row) => sum + row.recall, 0) / rows.length;
const pairCoherence = rows.reduce((sum, row) => sum + row.coherence, 0) / rows.length;
const medianSavings = median(rows.map((row) => row.removed));
const latencies = rows.map((row) => row.medianMs).sort((a, b) => a - b);
const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
const passingCases = rows.filter((row) => row.recall === 1 && row.coherence === 1).length;

console.log(`\nCases passing: ${passingCases}/${rows.length}`);
console.log(`Oracle evidence recall: ${(oracleRecall * 100).toFixed(1)}%`);
console.log(`Declared pair coherence: ${(pairCoherence * 100).toFixed(1)}%`);
console.log(`Median tokens removed: ${medianSavings.toFixed(1)}%`);
console.log(`p95 warm latency: ${p95Latency.toFixed(3)}ms`);

if (passingCases !== rows.length || oracleRecall < 0.99 || pairCoherence < 1 || medianSavings < 55) {
  process.exitCode = 1;
}
