# MarsCompress

MarsCompress is an open, query-aware context compiler for chatbots, RAG pipelines,
support agents, and coding tools. It removes low-value context before inference
without another model call, a GPU, an API key, or telemetry. Version 2 adds
conversation exchange linking, superseded-state handling, forward references,
bounded near-duplicate lookup, and million-character scaling.

## Why

Chat applications repeatedly send growing history, retrieved documents, and tool
traces to an LLM. MarsCompress segments that context, scores each block against the
current user request, preserves instructions and structural dependencies, removes
duplicates, and returns an inspectable keep/drop report.

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000/playground`, or call the API:

```bash
curl -X POST http://localhost:3000/api/compress \
  -H "content-type: application/json" \
  -d '{"context":"## Account\nPlan: Pro","query":"Which plan?"}'
```

Use the engine directly:

```js
import { compressContext } from "marscompress";

const result = compressContext(context, currentUserMessage, {
  policy: "frontier",
  fallbackOnHighRisk: true
});
console.log(result.compressedText);
```

For role-aware chat histories:

```js
import { compressMessages } from "marscompress";

const result = compressMessages(messages, currentUserMessage, {
  fallbackOnHighRisk: true
});
await provider.chat({ messages: result.messages });
```

Or use the CLI:

```bash
marscompress --query "What caused the outage?" --file incident.md
```

## What the engine protects

- Explicit system instructions, constraints, and security language
- Exact identifiers, dates, paths, names, and numbers referenced in the query
- Query-relevant code and surrounding headings
- Recent chat turns when they carry current evidence
- Linked user/assistant exchanges and relevant tool-call chains
- Antecedents for referential phrases such as “it” and “that”
- The newest matching state unless the query explicitly asks for history
- One canonical copy of duplicated content

The `risk` field is designed for a production fallback. Set
`fallbackOnHighRisk: true` to return the original context automatically when
the verifier cannot prove full query-term and instruction coverage.

## Verify

```bash
npm run check
npm run benchmark
npm run benchmark:scale
npm run benchmark:pareto
```

The bundled suite contains 224 answer-bearing fixtures across customer support,
RAG documentation, coding agents, incidents, policy, and chat memory, plus
adversarial and 2,000-turn conversation tests. See
[BENCHMARKS.md](BENCHMARKS.md) for the methodology and current results.

## Deploy

The application is a standard Next-compatible edge app. Build it with:

```bash
npm run build
npm run start
```

For a container or platform deployment, expose port `3000` and protect
`/api/compress` with your normal authentication and rate limiting.

## Design boundaries

MarsCompress is a small deterministic compiler, not an embedding or generative
model. It performs best when the current request shares terms, identifiers, or
known concepts with the answer evidence. Highly implicit semantic relationships
need domain vocabulary extensions or a high-risk fallback.

## License

MIT. Use, modify, embed, and self-host it anywhere.
