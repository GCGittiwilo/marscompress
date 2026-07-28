import Link from "next/link";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Playground } from "./components/Playground";

const integrations = ["OpenAI", "Anthropic", "Gemini", "LangChain", "Vercel AI", "Ollama", "RAG", "MCP"];

export default function Home() {
  return (
    <main>
      <Header />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>Open source</span> Query-aware context compiler</div>
          <h1>Send less context.<br /><em>Keep what answers.</em></h1>
          <p className="hero-lede">
            MarsCompress removes duplicated, irrelevant, and noisy context before
            your chatbot calls an LLM—without another model, a GPU, or a vendor lock-in.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/playground">Try your context <span>↗</span></Link>
            <Link className="text-button" href="/docs">Read the 3-minute setup <span>→</span></Link>
          </div>
          <div className="proof-line">
            <span><b>0</b> model calls</span>
            <span><b>&lt;5ms</b> typical local latency</span>
            <span><b>MIT</b> licensed</span>
          </div>
        </div>
        <Playground compact />
      </section>

      <section className="marquee" aria-label="Compatible integrations">
        <span>WORKS BEFORE ANY MODEL CALL</span>
        {integrations.map((name) => <b key={name}>{name}</b>)}
      </section>

      <section className="problem-section">
        <p className="section-kicker">THE HIDDEN COST</p>
        <div className="problem-grid">
          <h2>Your model rereads the whole room for every question.</h2>
          <div>
            <p>
              Chat history, retrieved documents, tool output, and logs grow with every turn.
              Most applications resend all of it—even when only a few lines matter now.
            </p>
            <p>
              MarsCompress sits between context assembly and inference. It scores semantic
              blocks against the current request, protects instructions and code structure,
              removes duplicates, and tells you what changed.
            </p>
          </div>
        </div>
        <div className="comparison-card">
          <div className="comparison-before">
            <span>RAW CONTEXT</span>
            <strong>18,420</strong>
            <small>tokens / request</small>
            <div className="context-bars" aria-hidden="true">
              {[94, 76, 88, 54, 98, 69, 84, 42, 91, 62].map((width, index) => <i key={index} style={{ width: `${width}%` }} />)}
            </div>
          </div>
          <div className="compiler-node">
            <span>QUERY</span>
            <i>→</i>
            <b>M</b>
            <i>→</i>
            <span>EVIDENCE</span>
          </div>
          <div className="comparison-after">
            <span>COMPILED CONTEXT</span>
            <strong>5,702</strong>
            <small>tokens / request</small>
            <div className="kept-bar"><i /></div>
            <em>69% less input</em>
          </div>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="section-intro">
          <p className="section-kicker">HOW IT WORKS</p>
          <h2>A compiler pass for context.</h2>
          <p>No summarization drift. No opaque second LLM. Each decision is inspectable.</p>
        </div>
        <div className="steps-grid">
          <article>
            <span>01 / SEGMENT</span>
            <div className="step-icon">¶</div>
            <h3>Understand the structure</h3>
            <p>Split chats, Markdown, code, logs, and retrieved documents into meaningful blocks—not arbitrary chunks.</p>
          </article>
          <article>
            <span>02 / SCORE</span>
            <div className="step-icon">⌁</div>
            <h3>Rank against the query</h3>
            <p>Combine lexical evidence, concepts, identifiers, recency, instructions, and structural dependencies.</p>
          </article>
          <article>
            <span>03 / VERIFY</span>
            <div className="step-icon">✓</div>
            <h3>Keep evidence intact</h3>
            <p>Restore parent headings and required neighbors, then report retention, risk, and every keep/drop reason.</p>
          </article>
        </div>
      </section>

      <section className="bench-section">
        <div>
          <p className="section-kicker">BUILT TO BE MEASURED</p>
          <h2>Quality first.<br />Savings second.</h2>
          <p>
            The bundled evaluation suite checks answer-bearing lines across support,
            RAG, code, policy, incidents, and chat history. Run it locally and add your own cases.
          </p>
          <Link className="text-button light" href="/benchmarks">Inspect the methodology <span>→</span></Link>
        </div>
        <div className="benchmark-visual">
          <div className="benchmark-label"><span>Oracle evidence recall</span><b>100%</b></div>
          <div className="benchmark-track"><i style={{ width: "100%" }} /></div>
          <div className="benchmark-label"><span>Median tokens removed</span><b>54.3%</b></div>
          <div className="benchmark-track coral"><i style={{ width: "54.3%" }} /></div>
          <div className="benchmark-label"><span>Eval cases passing</span><b>24 / 24</b></div>
          <div className="benchmark-track"><i style={{ width: "100%" }} /></div>
          <p>Results are reproducible—not a marketing-only hosted benchmark.</p>
        </div>
      </section>

      <section className="cta-section">
        <span className="orb orb-one" />
        <span className="orb orb-two" />
        <p className="section-kicker">YOUR CONTEXT. YOUR INFRASTRUCTURE.</p>
        <h2>Make every token earn its place.</h2>
        <p>Run in-browser, import the engine, or expose the HTTP endpoint. No account required.</p>
        <div className="cta-actions">
          <Link className="primary-button dark-button" href="/playground">Open the playground <span>↗</span></Link>
          <code>npm install ./marscompress</code>
        </div>
      </section>
      <Footer />
    </main>
  );
}
