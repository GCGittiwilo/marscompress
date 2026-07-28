const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "could",
  "did", "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in",
  "into", "is", "it", "its", "may", "me", "my", "of", "on", "or", "our", "should",
  "so", "than", "that", "the", "their", "them", "then", "there", "these", "they",
  "this", "to", "us", "was", "we", "were", "what", "when", "where", "which", "who",
  "why", "will", "with", "would", "you", "your",
]);

const CONCEPTS = [
  ["cost", "price", "pricing", "bill", "billing", "payment", "charge", "plan", "subscription"],
  ["error", "fail", "failed", "failure", "bug", "issue", "exception", "crash", "broken"],
  ["install", "setup", "configure", "configuration", "deploy", "deployment", "start"],
  ["api", "endpoint", "route", "request", "response", "http", "webhook"],
  ["account", "user", "customer", "profile", "member", "seat"],
  ["security", "auth", "authentication", "permission", "token", "key", "secret"],
  ["fast", "speed", "latency", "performance", "slow", "timeout"],
  ["date", "deadline", "due", "schedule", "time", "when"],
  ["owner", "assignee", "responsible", "who", "contact"],
];

const CRITICAL_RE = /\b(must|never|always|required|critical|important|constraint|system\s*(?:prompt|message)|do not|don't|cannot|security|warning)\b/i;
const NOISE_RE = /\b(debug|heartbeat|telemetry|stack trace|verbose|cache hit|progress|loading|retrying)\b/i;
const HEADING_RE = /^(#{1,6}\s+|[A-Z][A-Z0-9 _/-]{3,}:?\s*$|\[[^\]]+\]\s*$)/;
const CODE_RE = /(```|^\s{2,}(?:const|let|var|def|class|function|import|from|SELECT|curl|npm|pip)\b|[{}();=>])/m;

function stem(word) {
  let value = word.toLowerCase();
  if (value.length > 5) value = value.replace(/(ingly|edly|ation|ments|ment|ness|ing|ers|ies|ed|es|s)$/i, "");
  return value;
}

function terms(text) {
  return (text.match(/[A-Za-zÀ-ž0-9_./:@-]+/g) || [])
    .map(stem)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function expandedQueryTerms(query) {
  const base = new Set(terms(query));
  for (const group of CONCEPTS) {
    if (group.some((word) => base.has(stem(word)))) {
      group.forEach((word) => base.add(stem(word)));
    }
  }
  return base;
}

export function estimateTokens(text) {
  if (!text) return 0;
  const words = text.match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
  return Math.max(1, Math.ceil(words.length * 0.78));
}

function splitOversizedBlock(block, maxChars = 1200) {
  if (block.length <= maxChars) return [block];
  const lines = block.split("\n");
  const chunks = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > maxChars) {
      chunks.push(current);
      current = "";
    }
    current += `${current ? "\n" : ""}${line}`;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function segmentContext(context) {
  const normalized = String(context || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) blocks.push(...splitOversizedBlock(text));
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) inFence = !inFence;

    const beginsSemanticBlock =
      !inFence &&
      current.length > 0 &&
      (HEADING_RE.test(trimmed) ||
        /^(system|user|assistant|tool)\s*:/i.test(trimmed) ||
        /^(?:\d{4}-\d{2}-\d{2}|\[\d{2}:\d{2}(?::\d{2})?\])/.test(trimmed));

    if (beginsSemanticBlock) flush();

    if (!inFence && !trimmed) {
      flush();
    } else {
      current.push(line);
    }
  }
  flush();
  return blocks;
}

function blockHeading(text, index) {
  const first = text.split("\n")[0].replace(/^#{1,6}\s*/, "").trim();
  if (first.length <= 64) return first || `Block ${index + 1}`;
  return `${first.slice(0, 61)}…`;
}

function similarity(a, b) {
  const aTerms = new Set(terms(a));
  const bTerms = new Set(terms(b));
  if (!aTerms.size || !bTerms.size) return 0;
  let intersection = 0;
  for (const term of aTerms) if (bTerms.has(term)) intersection++;
  return intersection / Math.min(aTerms.size, bTerms.size);
}

function scoreBlock(block, query, queryTerms, index, count) {
  const blockTerms = terms(block);
  const termSet = new Set(blockTerms);
  const rawLower = block.toLowerCase();
  const queryLower = query.trim().toLowerCase();
  let matched = 0;
  let exactMatched = 0;

  for (const term of queryTerms) {
    if (termSet.has(term)) matched++;
    if (term.length >= 4 && rawLower.includes(term)) exactMatched++;
  }

  const coverage = queryTerms.size ? matched / queryTerms.size : 0;
  let score = coverage * 7 + exactMatched * 0.45;
  const reasons = [];

  if (coverage >= 0.5) reasons.push("strong query match");
  else if (matched > 0) reasons.push("matches query terms");

  if (queryLower.length >= 6 && rawLower.includes(queryLower)) {
    score += 5;
    reasons.push("contains exact query");
  }

  const identifiers = query.match(/\b(?:[A-Z][A-Za-z0-9_-]{2,}|[a-z]+_[a-z0-9_]+|[\w.-]+\.(?:js|ts|py|go|rs|md|json|yaml|yml)|\d+(?:\.\d+)*)\b/g) || [];
  const identifierHits = identifiers.filter((id) => rawLower.includes(id.toLowerCase())).length;
  if (identifierHits) {
    score += identifierHits * 2.4;
    reasons.push("preserves named evidence");
  }

  if (CRITICAL_RE.test(block)) {
    score += 2.2;
    reasons.push("instruction or constraint");
  }
  if (CODE_RE.test(block) && (matched || /\b(code|function|class|api|error|file|implement|return)\b/i.test(query))) {
    score += 1.5;
    reasons.push("relevant code structure");
  }
  if (HEADING_RE.test(block.trim())) score += 0.3;
  if (index === count - 1 && /^(user|assistant)\s*:/i.test(block.trim())) {
    score += 1.2;
    reasons.push("recent conversation turn");
  }
  if (NOISE_RE.test(block) && matched === 0 && !CRITICAL_RE.test(block)) {
    score -= 1.4;
    reasons.push("low-signal operational noise");
  }

  return { score, reasons, coverage, critical: CRITICAL_RE.test(block) };
}

function dedupeBlocks(blocks) {
  const duplicateOf = new Map();
  for (let i = 0; i < blocks.length; i++) {
    for (let j = 0; j < i; j++) {
      if (similarity(blocks[i], blocks[j]) >= 0.9) {
        duplicateOf.set(i, j);
        break;
      }
    }
  }
  return duplicateOf;
}

export function compressContext(context, query, options = {}) {
  if (typeof context !== "string" || typeof query !== "string") {
    throw new TypeError("context and query must be strings");
  }
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const blocks = segmentContext(context);
  const originalTokens = estimateTokens(context);

  if (!context.trim()) {
    return {
      compressedText: "",
      originalTokens: 0,
      keptTokens: 0,
      tokensSaved: 0,
      savingsPercent: 0,
      importantKeptPercent: 100,
      risk: "low",
      latencyMs: 0,
      keptBlocks: [],
      droppedBlocks: [],
      annotations: [],
      policy: "MarsCompress/query-aware-v1",
    };
  }

  if (!query.trim() || blocks.length <= 1 || originalTokens < 16) {
    const latencyMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    return {
      compressedText: context.trim(),
      originalTokens,
      keptTokens: originalTokens,
      tokensSaved: 0,
      savingsPercent: 0,
      importantKeptPercent: 100,
      risk: query.trim() ? "low" : "medium",
      latencyMs,
      keptBlocks: blocks.map((text, index) => ({ index, heading: blockHeading(text, index), reason: "short context; preserved" })),
      droppedBlocks: [],
      annotations: blocks.map((text, index) => ({ index, text, kept: true, score: 1, reason: "short context; preserved" })),
      policy: "MarsCompress/query-aware-v1",
    };
  }

  const queryTerms = expandedQueryTerms(query);
  const duplicateOf = dedupeBlocks(blocks);
  const scored = blocks.map((text, index) => ({
    index,
    text,
    heading: blockHeading(text, index),
    ...scoreBlock(text, query, queryTerms, index, blocks.length),
  }));

  for (const block of scored) {
    if (duplicateOf.has(block.index)) {
      block.score -= 5;
      block.reasons.push("duplicate of earlier context");
    }
  }

  const ranked = [...scored].sort((a, b) => b.score - a.score || a.index - b.index);
  const budgetRatio = Math.min(0.85, Math.max(0.15, Number(options.budgetRatio) || 0.25));
  const targetTokens = Math.max(32, Math.round(originalTokens * budgetRatio));
  const keep = new Set();
  let keptEstimate = 0;

  for (const block of ranked) {
    if (duplicateOf.has(block.index)) continue;
    const blockTokens = estimateTokens(block.text);
    const highConfidence = block.score >= 2.2 || block.critical;
    if (highConfidence || (keptEstimate < targetTokens && block.score > 0.15)) {
      keep.add(block.index);
      keptEstimate += blockTokens;
    }
  }

  if (!keep.size) {
    keep.add(ranked[0].index);
  }

  // Preserve structural parents and the nearest evidence neighbor.
  for (const index of [...keep]) {
    const previous = scored[index - 1];
    const isStandaloneHeading =
      previous &&
      !previous.text.includes("\n") &&
      HEADING_RE.test(previous.text.trim());
    if (previous && isStandaloneHeading && !duplicateOf.has(previous.index)) {
      keep.add(previous.index);
    }
  }

  const compressedText = scored
    .filter((block) => keep.has(block.index))
    .map((block) => block.text)
    .join("\n\n");
  const keptTokens = estimateTokens(compressedText);
  const tokensSaved = Math.max(0, originalTokens - keptTokens);
  const savingsPercent = originalTokens ? (tokensSaved / originalTokens) * 100 : 0;
  const importantBlocks = scored.filter((block) => block.score >= 2.2 || block.critical);
  const importantKept = importantBlocks.filter((block) => keep.has(block.index)).length;
  const importantKeptPercent = importantBlocks.length ? (importantKept / importantBlocks.length) * 100 : 100;
  const topDroppedScore = Math.max(0, ...scored.filter((block) => !keep.has(block.index)).map((block) => block.score));
  const risk =
    importantKeptPercent < 95 || topDroppedScore >= 2.2
      ? "high"
      : savingsPercent > 85 || queryTerms.size < 2
        ? "medium"
        : "low";
  const latencyMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;

  const annotations = scored.map((block) => ({
    index: block.index,
    text: block.text,
    kept: keep.has(block.index),
    score: Number(block.score.toFixed(3)),
    reason: keep.has(block.index)
      ? block.reasons[0] || "highest available relevance"
      : block.reasons.includes("duplicate of earlier context")
        ? "duplicate context removed"
        : "low relevance to current query",
  }));

  return {
    compressedText,
    originalTokens,
    keptTokens,
    tokensSaved,
    savingsPercent,
    importantKeptPercent,
    risk,
    latencyMs,
    keptBlocks: annotations.filter((block) => block.kept).map(({ index, reason }) => ({
      index,
      heading: scored[index].heading,
      reason,
    })),
    droppedBlocks: annotations.filter((block) => !block.kept).map(({ index, reason }) => ({
      index,
      heading: scored[index].heading,
      reason,
    })),
    annotations,
    policy: "MarsCompress/query-aware-v1",
  };
}
