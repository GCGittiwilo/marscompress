import type { Metadata } from "next";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Playground } from "../components/Playground";

export const metadata: Metadata = {
  title: "Playground",
  description: "Compress chatbot context locally in your browser with MarsCompress.",
};

export default function PlaygroundPage() {
  return (
    <main>
      <Header />
      <section className="page-shell playground-page">
        <div className="page-hero">
          <p className="section-kicker">LIVE · LOCAL · INSPECTABLE</p>
          <h1>Put your context on a diet.</h1>
          <p>
            Everything runs in this tab. Paste the same chat history, RAG results,
            or tool trace your application would send, then ask what the next answer needs.
          </p>
        </div>
        <Playground />
      </section>
      <Footer />
    </main>
  );
}

