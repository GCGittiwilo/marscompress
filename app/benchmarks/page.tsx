import type { Metadata } from "next";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

export const metadata: Metadata = {
  title: "Benchmarks",
  description: "Reproducible MarsCompress evidence-retention and compression benchmarks.",
};

const domains = [
  ["Customer support", "28", "100%", "100%", "73.9%"],
  ["RAG documentation", "28", "100%", "100%", "64.5%"],
  ["Coding agents", "28", "100%", "100%", "64.0%"],
  ["Incident logs", "28", "100%", "100%", "72.0%"],
  ["Policy & contracts", "28", "100%", "100%", "69.0%"],
  ["Chat memory", "84", "100%", "100%", "92.7%"],
];

export default function BenchmarksPage() {
  return (
    <main>
      <Header />
      <section className="page-shell">
        <div className="page-hero">
          <p className="section-kicker">REPRODUCIBLE EVALUATION</p>
          <h1>Benchmarks you can disagree with—and rerun.</h1>
          <p>
            The public suite measures whether answer-critical evidence survives,
            how many tokens are removed, and how long compilation takes. No model grades itself.
          </p>
        </div>
        <div className="benchmark-cards">
          <article><strong>224 / 224</strong><span>answer-bearing eval cases preserved</span></article>
          <article><strong>100%</strong><span>oracle evidence recall in the bundled suite</span></article>
          <article><strong>77.1%</strong><span>median estimated tokens removed</span></article>
        </div>
        <table className="benchmark-table">
          <thead><tr><th>Domain</th><th>Cases</th><th>Evidence recall</th><th>Pair coherence</th><th>Median reduction</th></tr></thead>
          <tbody>
            {domains.map((row) => (
              <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <div className="docs-content" style={{ maxWidth: 820, marginTop: 70 }}>
          <h2>What is measured</h2>
          <p>
            Each fixture declares one or more exact evidence strings required to
            answer its query. A case passes only when every required string exists
            in the compiled context. Token reduction is then reported separately.
            This prevents impressive savings from hiding missing answers.
          </p>
          <h2>Run it yourself</h2>
          <pre className="code-block">{`npm test
npm run benchmark
npm run benchmark:scale
npm run benchmark:pareto`}</pre>
          <p>
            Results vary by machine and fixture length. The checked-in report records
            the environment, per-case outcome, aggregate recall, median reduction, and p95 latency.
          </p>
          <h2>Know the boundary</h2>
          <p>
            MarsCompress is lexical and structure-aware, not an embedding model. It can
            miss highly implicit relationships or domain-specific synonyms. When the
            verifier reports high risk, enable deterministic full-context fallback or use
            a larger retention ratio. “Pareto frontier” refers to the checked-in corpus and
            this machine—not a claim of universal optimality over every possible prompt.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
