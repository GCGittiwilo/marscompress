import { performance } from "node:perf_hooks";
import { compressContext } from "../lib/compress.js";

const thresholds = [
  { label: "1K", chars: 1_000, p95Ms: 1 },
  { label: "100K", chars: 100_000, p95Ms: 100 },
  { label: "1M", chars: 1_000_000, p95Ms: 1_500 },
];

function makeContext(targetChars) {
  const blocks = [];
  let length = 0;
  let index = 0;
  while (length < targetChars) {
    const block = `## Event ${index}\nRequest ${index} completed. Cache key item_${index}. Status nominal.\n`;
    blocks.push(block);
    length += block.length + 1;
    index++;
  }
  blocks.splice(Math.floor(blocks.length / 2), 0, "## Critical evidence\nProject ORBIT launches on 2031-09-17.\n");
  return blocks.join("\n");
}

const rows = [];
let failed = false;
for (const threshold of thresholds) {
  const context = makeContext(threshold.chars);
  for (let warm = 0; warm < 3; warm++) compressContext(context, "When does Project ORBIT launch?");

  const runs = [];
  let result;
  const heapBefore = process.memoryUsage().heapUsed;
  for (let run = 0; run < 20; run++) {
    const started = performance.now();
    result = compressContext(context, "When does Project ORBIT launch?");
    runs.push(performance.now() - started);
  }
  const heapAfter = process.memoryUsage().heapUsed;
  runs.sort((a, b) => a - b);
  const p95 = runs[Math.min(runs.length - 1, Math.ceil(runs.length * 0.95) - 1)];
  const heapDeltaMb = Math.max(0, heapAfter - heapBefore) / 1024 / 1024;
  const evidenceKept = result.compressedText.includes("2031-09-17");
  const pass = p95 < threshold.p95Ms && heapDeltaMb < 256 && evidenceKept;
  if (!pass) failed = true;
  rows.push({
    scale: threshold.label,
    characters: context.length,
    blocks: result.annotations.length,
    "p95 ms": p95.toFixed(2),
    "limit ms": threshold.p95Ms,
    "heap Δ MB": heapDeltaMb.toFixed(1),
    "removed %": result.savingsPercent.toFixed(1),
    evidence: evidenceKept ? "kept" : "DROPPED",
    pass: pass ? "yes" : "NO",
  });
}

console.table(rows);
if (failed) process.exitCode = 1;

