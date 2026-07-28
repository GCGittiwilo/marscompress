import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <div className="brand footer-brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>MarsCompress</span>
        </div>
        <p>Open context compression for every chatbot.</p>
      </div>
      <div className="footer-links">
        <Link href="/docs">Documentation</Link>
        <Link href="/benchmarks">Benchmarks</Link>
        <Link href="/docs#quickstart">Self-host guide</Link>
      </div>
      <p className="footer-note">MIT licensed · No telemetry · Built in the open</p>
    </footer>
  );
}
