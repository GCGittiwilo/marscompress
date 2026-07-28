# MarsCompress benchmark methodology

MarsCompress reports a measured Pareto frontier, not a universal optimum. The
frontier is defined over the checked-in corpus, baselines, machine, and thresholds
below. Every result is reproducible from source.

## Quality corpus

- 224 answer-bearing cases: 28 each for support, RAG, code, incidents, and policy;
  84 for chat history.
- Evidence may appear at the beginning, middle, or end and among duplicate,
  adversarial, and query-overlapping distractors.
- Chat cases contain 18–30 historical exchanges and declare both answer evidence
  and user/assistant turns that must remain together.
- Additional tests cover 2,000-turn history, changed user state, explicit history
  requests, pronoun dependencies, aliases, tool results, prompt injection, code
  fences, exact no-op behavior, and deterministic risk fallback.

Metrics:

- **Oracle evidence recall:** exact answer-critical strings retained.
- **Pair coherence:** declared user/assistant exchange turns retained together.
- **Token reduction:** estimated tokens removed from the original context.
- **Latency:** warm in-process wall time measured with `performance.now()`.
- **Memory:** heap growth reported by the scale benchmark.

## Current results

Measured locally on July 28, 2026:

| Domain | Cases | Evidence recall | Pair coherence | Median removed |
|---|---:|---:|---:|---:|
| Customer support | 28 | 100% | 100% | 73.9% |
| RAG documentation | 28 | 100% | 100% | 64.5% |
| Coding agents | 28 | 100% | 100% | 64.0% |
| Incident logs | 28 | 100% | 100% | 72.0% |
| Policy and contracts | 28 | 100% | 100% | 69.0% |
| Chat memory | 84 | 100% | 100% | 92.7% |
| **Overall** | **224** | **100%** | **100%** | **77.1%** |

Overall p95 warm latency across the quality corpus was 0.251 ms.

Scale benchmark:

| Input | Blocks | p95 latency | Heap delta | Evidence |
|---|---:|---:|---:|---:|
| ~1K characters | 16 | 0.25 ms | 0.9 MB | kept |
| ~100K characters | 1,361 | 7.55 ms | below 256 MB | kept |
| ~1M characters | 13,082 | 79.83 ms | below 256 MB | kept |

Timing and heap values vary by hardware and runtime. The checked-in thresholds
are 1 ms, 100 ms, and 1.5 seconds respectively, with a 256 MB heap ceiling.

## Pareto comparison

The policy benchmark compares positional truncation, keyword selection, and
three MarsCompress budget policies. A candidate only materially dominates
another when it improves recall or savings by at least one percentage point, or
latency by at least 5%, without a material regression elsewhere.

| Policy | Evidence recall | Pair coherence | Median removed | p95 |
|---|---:|---:|---:|---:|
| Head 35% | 24.91% | 33.13% | 65.1% | <0.01 ms |
| Tail 35% | 32.97% | 38.13% | 64.9% | <0.01 ms |
| Keyword 35% | 94.14% | 91.25% | 64.2% | 0.087 ms |
| Mars precision | 100% | 100% | 77.1% | 0.314 ms |
| Mars balanced | 100% | 100% | 77.1% | 0.270 ms |
| **Mars frontier (default)** | **100%** | **100%** | **77.1%** | **0.242 ms** |

The retained `frontier` policy is non-dominated under those materiality rules.
The two alternative Mars policies did not improve recall, coherence, or savings,
and were more than 5% slower in the recorded run.

## Run it

```bash
npm test
npm run benchmark
npm run benchmark:scale
npm run benchmark:pareto
```

## Design basis and limitations

The engine adopts question-aware coarse-to-fine selection and dynamic budgeting
ideas demonstrated by [LongLLMLingua](https://aclanthology.org/2024.acl-long.91/)
and the redundancy-removal objective studied by
[Selective Context](https://arxiv.org/abs/2310.06201), while deliberately using
no learned model or extra inference call.

The corpus remains synthetic and deterministic. Exact-string oracle recall does
not prove downstream answer equivalence for every model, language, or domain.
Highly implicit relationships, unseen vocabulary, irony, and facts requiring
world knowledge can still be missed. Use application-specific cases and enable
`fallbackOnHighRisk` before production rollout.
