# MarsCompress

[![CI](https://github.com/GCGittiwilo/marscompress/actions/workflows/ci.yml/badge.svg)](https://github.com/GCGittiwilo/marscompress/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2ea44f.svg)](LICENSE)
[![Zero runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-2ea44f.svg)](package.json)

Open-source, query-aware context compression for chatbots, RAG pipelines,
support agents, and coding tools. MarsCompress removes low-value context before
inference without another model call, a GPU, an API key, or telemetry.

**[Try the live playground](https://marscompress-open.cify6gaming.chatgpt.site/playground)**
· [Read the benchmarks](BENCHMARKS.md) · [View the API docs](https://marscompress-open.cify6gaming.chatgpt.site/docs)

## Pick the easiest way to use it

### Install the tiny library

The published package contains the engine, types, and CLI only. It has zero
runtime dependencies and works with Node.js 18 or newer.

```bash
npm install github:GCGittiwilo/marscompress
```

```js
import { compressContext } from "marscompress";

const result = compressContext(longContext, currentUserMessage, {
  policy: "frontier",
  fallbackOnHighRisk: true,
});

// Send result.compressedText to OpenAI, Anthropic, a local model, or any
// provider you already use.
console.log(result.compressedText);
```

### Compress a chat history

```js
import { compressMessages } from "marscompress";

const result = compressMessages(messages, currentUserMessage, {
  fallbackOnHighRisk: true,
});

// Provider-agnostic: result.messages is still an array of { role, content }.
const response = await yourChatProvider({
  messages: [...result.messages, { role: "user", content: currentUserMessage }],
});
```

MarsCompress keeps system instructions, linked user/assistant exchanges,
tool-call chains, referenced facts, and the newest relevant state. See the
complete [chat-history example](examples/chat-history.mjs).

### Run the CLI without installing

```bash
npx github:GCGittiwilo/marscompress \
  --query "What caused the outage?" \
  --file incident.md
```

For pipelines, send JSON over stdin:

```bash
printf '%s' '{"context":"Plan: Pro","query":"Which plan?"}' |
  npx github:GCGittiwilo/marscompress --json
```

The JSON form also accepts a `messages` array.

### Run the complete API and playground

```bash
git clone https://github.com/GCGittiwilo/marscompress.git
cd marscompress
docker compose up --build
```

Open `http://localhost:3000/playground`, or call the REST endpoint:

```bash
curl http://localhost:3000/api/compress \
  -H "content-type: application/json" \
  -d '{"context":"## Account\nPlan: Pro","query":"Which plan?","fallbackOnHighRisk":true}'
```

No Docker? Use `npm ci && npm run dev`.

## Drop-in API

### `compressContext(context, query, options?)`

Compresses a string and returns:

```js
{
  compressedText,
  originalTokens,
  keptTokens,
  tokensSaved,
  savingsPercent,
  importantKeptPercent,
  queryCoveragePercent,
  risk,                  // "low" | "medium" | "high"
  fallbackApplied,
  fallbackReason,
  latencyMs,
  keptBlocks,
  droppedBlocks,
  annotations
}
```

### `compressMessages(messages, query, options?)`

Accepts any `{ role, content }[]` conversation and returns the same report plus
a compressed `messages` array. It is intentionally provider-neutral.

### Options

| Option | Default | Purpose |
| --- | --- | --- |
| `policy` | `"frontier"` | `"precision"`, `"balanced"`, `"frontier"`, or `"aggressive"` |
| `budgetRatio` | adaptive | Preferred fraction of context to retain |
| `fallbackOnHighRisk` | `false` | Return the original input if verification reports high risk |

## What it protects

- System and developer instructions, constraints, and security language
- Identifiers, dates, paths, names, and numbers referenced by the query
- Query-relevant code with its structural context
- Linked user/assistant exchanges and relevant tool results
- Antecedents for phrases such as “it”, “that”, and “the previous one”
- The newest matching state unless the query explicitly asks for history
- One canonical copy of duplicated content
- Exact no-op behavior for already-minimal inputs

## How it works

MarsCompress is a deterministic context compiler:

1. Segment documents and conversations into structural blocks.
2. Score relevance against the current request using terms, identifiers,
   lightweight concepts, and recency.
3. Build dependencies between instructions, chat exchanges, references, and
   tool results.
4. Remove duplicates and superseded state.
5. Select a coherent context within an adaptive budget.
6. Verify query and instruction coverage, then expose a risk level or fall back.

The engine is local and does not make network requests.

## Measured performance

The bundled evaluation contains 224 answer-bearing cases across support, RAG,
code, incidents, policy, and long chat histories.

| Metric | Result |
| --- | ---: |
| Evidence recall | 100% |
| Paired-turn coherence | 100% |
| Median token reduction | 77.1% |
| 100K-character p95 latency | 6.75 ms |
| 1M-character p95 latency | 56.52 ms |
| 1M-character peak heap | ~81 MB |

These are measured results on the documented local benchmark, not a claim of a
universal optimum. Reproduce them with:

```bash
npm run benchmark
npm run benchmark:scale
npm run benchmark:pareto
```

See [BENCHMARKS.md](BENCHMARKS.md) for the corpus, methodology, baselines,
limitations, and research references.

## Development

```bash
npm ci
npm run check
```

Useful commands:

```bash
npm test
npm run typecheck
npm run build
npm run lint
npm pack --dry-run
```

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md) before opening a pull request or security report.

## Design boundary

MarsCompress is not an embedding or generative model. Highly implicit semantic
relationships may require domain vocabulary or the high-risk fallback. Always
measure compression against representative data before enabling it for
high-stakes workflows.

## License

[MIT](LICENSE). Use, modify, embed, redistribute, and self-host it anywhere.
