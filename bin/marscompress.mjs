#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { compressContext, compressMessages } from "../lib/compress.js";

const args = process.argv.slice(2);
const help = args.includes("--help") || args.includes("-h");

if (help) {
  process.stdout.write(`MarsCompress — query-aware context compression

Usage:
  marscompress --query "What matters?" --file context.md
  cat payload.json | marscompress --json
  npx github:GCGittiwilo/marscompress --query "What matters?" --file context.md

JSON input:
  {"context":"...","query":"...","budgetRatio":0.42}
  {"messages":[{"role":"user","content":"..."}],"query":"..."}

Options:
  --query <text>   Current user request
  --file <path>    Context file to compress
  --json           Read JSON from stdin and return the full result as JSON
  --help, -h       Show this help
`);
  process.exit(0);
}

try {
  if (args.includes("--json")) {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const payload = JSON.parse(input);
    if (typeof payload.query !== "string") {
      throw new Error("JSON input requires a string query.");
    }
    const result = Array.isArray(payload.messages)
      ? compressMessages(payload.messages, payload.query, payload)
      : compressContext(payload.context, payload.query, payload);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const queryIndex = args.indexOf("--query");
    const fileIndex = args.indexOf("--file");
    if (queryIndex < 0 || fileIndex < 0 || !args[queryIndex + 1] || !args[fileIndex + 1]) {
      throw new Error("Pass --query and --file, or use --json. Run with --help for examples.");
    }
    const context = await readFile(args[fileIndex + 1], "utf8");
    const result = compressContext(context, args[queryIndex + 1]);
    process.stdout.write(result.compressedText);
    process.stderr.write(`\n\n${result.tokensSaved} tokens saved (${result.savingsPercent.toFixed(1)}%), risk: ${result.risk}\n`);
  }
} catch (error) {
  process.stderr.write(`marscompress: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
