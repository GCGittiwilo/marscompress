# MarsCompress benchmark methodology

The benchmark is intentionally simple and auditable.

- **Oracle evidence recall:** every fixture declares exact strings required to
  answer its query. Recall is the fraction still present after compression.
- **Token reduction:** estimated input tokens minus compiled tokens, divided by
  estimated input tokens.
- **Latency:** 30 warm, in-process runs per fixture; the report uses each case's
  median and the p95 across case medians.
- **Domains:** four cases each for customer support, RAG documentation, coding
  agents, incident logs, policy/contracts, and chat memory.

Run:

```bash
npm test
npm run benchmark
```

## Acceptance bar

- 24/24 fixtures preserve all declared evidence.
- 100% aggregate oracle evidence recall.
- The production build and type check pass.
- Latency is reported, not hard-coded as a cross-machine pass/fail threshold.

## Important limitations

These fixtures prove deterministic evidence retention for the checked-in cases;
they do not prove downstream answer equivalence for every model or domain. Add
representative traffic from your own application before enabling compression on
all requests. Use the returned `risk` signal to fall back to full context.

