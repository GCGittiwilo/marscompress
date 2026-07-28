import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="MarsCompress home">
        <span className="brand-mark" aria-hidden="true">M</span>
        <span>MarsCompress</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#method">Method</Link>
        <Link href="/benchmarks">Benchmarks</Link>
        <Link href="/docs">Docs</Link>
      </nav>
      <Link className="header-cta" href="/playground">Open playground <span>↗</span></Link>
    </header>
  );
}

