"use client";

import { useMemo, useState } from "react";
import { compressContext, type CompressionResult } from "../../lib/compress.js";

const SAMPLES = {
  support: {
    label: "Support chat",
    query: "What plan is the customer on and why did their last payment fail?",
    context: `SYSTEM: You are a support agent. Never reveal private payment details. Always cite the account record.

## Customer account
Customer: Acme Bikes
Plan: Pro
Seats: 12
Renewal: August 14

## Product feedback
The customer asked for dark mode in April.
They also suggested a CSV export for analytics.

## Recent billing
July 18 — card ending 4402 was declined due to insufficient funds.
July 19 — customer asked whether their Pro workspace would be paused.

## Noisy tool trace
[debug] cache hit account_acme
[debug] billing lookup 200 OK
[debug] request completed in 184ms

## Previous conversation
Assistant: We can help with account access.
User: Thank you. I mainly need to understand the payment issue.`,
  },
  rag: {
    label: "RAG results",
    query: "How do I rotate an API key without downtime?",
    context: `# Authentication guide
API keys identify a project. Store them in a secret manager and never commit them to source control.

# UI customization
The dashboard supports light and dark themes. Theme changes are saved per browser.

# Key rotation
Create a second active key before revoking the original. Deploy the new key to every service, confirm traffic is using it, then revoke the old key. Two keys may be active during the transition.

# Webhook retries
Failed webhook deliveries retry with exponential backoff for 24 hours.

# Key rotation
Create a second active key before revoking the original. Deploy the new key to every service, confirm traffic is using it, then revoke the old key. Two keys may be active during the transition.

# Audit logs
Enterprise workspaces retain audit events for 365 days.`,
  },
  code: {
    label: "Agent trace",
    query: "Why does parseInvoice return null for invoice 1042?",
    context: `SYSTEM: Fix the smallest possible surface. Do not change public types.

## src/invoices.ts
\`\`\`ts
export function parseInvoice(input: Invoice) {
  if (!input.customerId) return null;
  return normalizeInvoice(input);
}
\`\`\`

## Test run
[debug] loading fixture 1039
[debug] loading fixture 1040
[debug] loading fixture 1041
[error] invoice 1042 has customer_id="cus_7" but customerId is undefined

## README edits
The installation guide now uses pnpm in all examples.

## src/fixtures.ts
\`\`\`ts
export const rawInvoice = { id: 1042, customer_id: "cus_7" };
\`\`\`

## Git status
M package-lock.json
M docs/installation.md`,
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function Playground({ compact = false }: { compact?: boolean }) {
  const [sampleKey, setSampleKey] = useState<keyof typeof SAMPLES>("support");
  const [query, setQuery] = useState(SAMPLES.support.query);
  const [context, setContext] = useState(SAMPLES.support.context);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const characterCount = useMemo(() => context.length, [context]);

  const chooseSample = (key: keyof typeof SAMPLES) => {
    setSampleKey(key);
    setQuery(SAMPLES[key].query);
    setContext(SAMPLES[key].context);
    setResult(null);
  };

  const compress = () => setResult(compressContext(context, query));

  return (
    <div className={`compressor ${compact ? "compressor-compact" : ""}`}>
      <div className="compressor-bar">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <span>local://marscompress</span>
        <span className="privacy-pill">● stays in browser</span>
      </div>
      <div className="sample-tabs" aria-label="Sample context">
        {(Object.keys(SAMPLES) as Array<keyof typeof SAMPLES>).map((key) => (
          <button
            className={sampleKey === key ? "active" : ""}
            key={key}
            onClick={() => chooseSample(key)}
            type="button"
          >
            {SAMPLES[key].label}
          </button>
        ))}
      </div>
      <label className="field-label" htmlFor={`query-${compact ? "compact" : "full"}`}>
        Current user request
      </label>
      <input
        id={`query-${compact ? "compact" : "full"}`}
        className="query-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="context-label-row">
        <label className="field-label" htmlFor={`context-${compact ? "compact" : "full"}`}>Context</label>
        <span>{formatNumber(characterCount)} chars</span>
      </div>
      <textarea
        id={`context-${compact ? "compact" : "full"}`}
        className="context-input"
        value={context}
        onChange={(event) => setContext(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") compress();
        }}
      />
      <div className="compress-actions">
        <button className="compress-button" onClick={compress} type="button">
          Compress context <span>⌘↵</span>
        </button>
        <span>Zero API calls</span>
      </div>

      {result && (
        <div className="result-panel" aria-live="polite">
          <div className="metric-row">
            <div><strong>{formatNumber(result.originalTokens)}</strong><span>before</span></div>
            <div className="metric-arrow">→</div>
            <div><strong>{formatNumber(result.keptTokens)}</strong><span>after</span></div>
            <div className="saved-metric"><strong>{result.savingsPercent.toFixed(1)}%</strong><span>removed</span></div>
          </div>
          <div className="result-meta">
            <span className={`risk risk-${result.risk}`}>● {result.risk} risk</span>
            <span>{result.importantKeptPercent.toFixed(0)}% important context kept</span>
            <span>{result.latencyMs.toFixed(1)}ms</span>
          </div>
          <div className="result-copy">
            <div className="result-copy-header">
              <span>Compressed context</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(result.compressedText)}>Copy</button>
            </div>
            <pre>{result.compressedText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

