# Contributing

Thanks for helping improve MarsCompress. Bug reports, evaluation cases,
documentation fixes, and compression-policy improvements are welcome.

## Local setup

```bash
git clone https://github.com/GCGittiwilo/marscompress.git
cd marscompress
npm ci
npm run check
```

Start the playground with `npm run dev`, then open
`http://localhost:3000/playground`.

## Pull requests

1. Add a focused regression test for behavioral changes.
2. Run `npm run typecheck`, `npm test`, and the relevant benchmarks.
3. Explain any accuracy, compression, latency, or memory tradeoff.
4. Keep compression deterministic and avoid adding network calls or telemetry.

New benchmark fixtures belong in `tests/eval-corpus.mjs`. Please do not tune a
policy for a single example at the expense of the broader suite.
