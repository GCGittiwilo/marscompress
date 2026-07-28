import { performance } from "node:perf_hooks";
import { compressContext } from "../lib/compress.js";
import { fixtures } from "../tests/fixtures.mjs";

const rows = [];
for (const item of fixtures) {
  const runs = [];
  let result;
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    result = compressContext(item.context, item.query);
    runs.push(performance.now() - start);
  }
  const evidenceKept = item.evidence.filter((value) => result.compressedText.includes(value)).length;
  rows.push({
    case: item.id,
    domain: item.domain,
    recall: evidenceKept / item.evidence.length,
    removed: result.savingsPercent,
    medianMs: runs.sort((a, b) => a - b)[Math.floor(runs.length / 2)],
  });
}

const sortedSavings = rows.map((row) => row.removed).sort((a, b) => a - b);
const allLatencies = rows.map((row) => row.medianMs).sort((a, b) => a - b);
const oracleRecall = rows.reduce((sum, row) => sum + row.recall, 0) / rows.length;
const medianSavings = sortedSavings[Math.floor(sortedSavings.length / 2)];
const p95Latency = allLatencies[Math.floor(allLatencies.length * 0.95)];

console.table(rows.map((row) => ({
  case: row.case,
  domain: row.domain,
  "recall %": (row.recall * 100).toFixed(0),
  "removed %": row.removed.toFixed(1),
  "median ms": row.medianMs.toFixed(3),
})));
console.log(`\nOracle evidence recall: ${(oracleRecall * 100).toFixed(1)}%`);
console.log(`Median tokens removed: ${medianSavings.toFixed(1)}%`);
console.log(`p95 warm latency: ${p95Latency.toFixed(3)}ms`);

if (oracleRecall < 1) process.exitCode = 1;

