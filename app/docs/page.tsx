import type { Metadata } from "next";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Install and integrate MarsCompress with any chatbot or LLM provider.",
};

export default function DocsPage() {
  return (
    <main>
      <Header />
      <section className="page-shell">
        <div className="page-hero">
          <p className="section-kicker">DOCUMENTATION / v1</p>
          <h1>One preprocessing step. Any model.</h1>
          <p>
            MarsCompress is a deterministic context compiler. Give it context and
            the current query, then send its output to the model you already use.
          </p>
        </div>
        <div className="docs-layout">
          <aside className="docs-nav">
            <span>ON THIS PAGE</span>
            <a href="#quickstart">Quickstart</a>
            <a href="#http">HTTP API</a>
            <a href="#javascript">JavaScript</a>
            <a href="#python">Python</a>
            <a href="#response">Response</a>
            <a href="#production">Production notes</a>
          </aside>
          <article className="docs-content">
            <h2 id="quickstart">Quickstart</h2>
            <p>
              Clone the repository and start the complete app. The playground and
              <span className="inline-code"> /api/compress</span> endpoint share the same engine.
            </p>
            <pre className="code-block">{`git clone https://github.com/your-org/marscompress
cd marscompress
npm install
npm run dev`}</pre>
            <div className="callout">
              The engine performs no network requests. Context remains in your process
              unless you choose to expose the HTTP route.
            </div>

            <h2 id="http">HTTP API</h2>
            <p>Call the endpoint before your provider request:</p>
            <pre className="code-block">{`curl -X POST http://localhost:3000/api/compress \\
  -H "content-type: application/json" \\
  -d '{
    "context": "SYSTEM: Be concise.\\n\\nAccount plan: Pro...",
    "query": "Which plan is this account on?"
  }'`}</pre>

            <h2 id="javascript">JavaScript / TypeScript</h2>
            <p>Import the pure engine when your application runs JavaScript:</p>
            <pre className="code-block">{`import { compressContext } from "./lib/compress.js";

const compiled = compressContext(chatHistory, userMessage);

const answer = await provider.chat({
  messages: [
    { role: "system", content: compiled.compressedText },
    { role: "user", content: userMessage }
  ]
});`}</pre>

            <h2 id="python">Python</h2>
            <p>
              Python and every other runtime can use the open HTTP contract. This
              tiny helper has no MarsCompress-specific dependency:
            </p>
            <pre className="code-block">{`import requests

def compress(context: str, query: str):
    response = requests.post(
        "http://localhost:3000/api/compress",
        json={"context": context, "query": query},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()`}</pre>

            <h2 id="response">Response contract</h2>
            <pre className="code-block">{`{
  "compressedText": "## Account\\nPlan: Pro",
  "originalTokens": 420,
  "keptTokens": 112,
  "tokensSaved": 308,
  "savingsPercent": 73.3,
  "importantKeptPercent": 100,
  "risk": "low",
  "latencyMs": 1.8,
  "keptBlocks": [{ "heading": "Account", "reason": "strong query match" }],
  "droppedBlocks": [{ "heading": "Changelog", "reason": "low relevance" }],
  "policy": "MarsCompress/query-aware-v1"
}`}</pre>

            <h2 id="production">Production notes</h2>
            <ul>
              <li>Keep system instructions in a distinct block; constraint language is protected automatically.</li>
              <li>Measure answer quality on your own traffic before enforcing a token budget.</li>
              <li>Use the returned risk signal to fall back to the full context when risk is high.</li>
              <li>Cap inbound payload size and authenticate the HTTP route when exposed publicly.</li>
              <li>Extend the checked-in eval cases with examples from your application domain.</li>
            </ul>
          </article>
        </div>
      </section>
      <Footer />
    </main>
  );
}

