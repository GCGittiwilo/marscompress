const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "could",
  "did", "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in",
  "into", "is", "it", "its", "may", "me", "my", "of", "on", "or", "our", "should",
  "so", "than", "that", "the", "their", "them", "then", "there", "these", "they",
  "this", "to", "us", "was", "we", "were", "what", "when", "where", "which", "who",
  "why", "will", "with", "would", "you", "your",
]);

const CONCEPTS = [
  ["cost", "price", "pricing", "bill", "billing", "payment", "charge", "plan", "subscription", "invoice"],
  ["error", "fail", "failed", "failure", "bug", "issue", "exception", "crash", "broken", "incident", "outage"],
  ["install", "setup", "configure", "configuration", "deploy", "deployment", "start", "initialize"],
  ["api", "endpoint", "route", "request", "response", "http", "webhook", "method"],
  ["account", "user", "customer", "profile", "member", "seat", "workspace"],
  ["security", "auth", "authentication", "permission", "token", "key", "secret", "credential", "access"],
  ["fast", "speed", "latency", "performance", "slow", "timeout", "duration"],
  ["date", "deadline", "due", "schedule", "time", "when", "day", "month", "year"],
  ["owner", "assignee", "responsible", "who", "contact", "lead"],
  ["location", "where", "region", "country", "address", "path", "file"],
  ["name", "called", "nickname", "title", "label"],
  ["choose", "chosen", "decision", "decide", "selected", "use", "using"],
  ["remember", "preference", "prefer", "favorite", "favourite", "like"],
  ["cause", "caused", "root", "reason", "why", "mitigate", "mitigated", "mitigation", "fix", "fixed", "resolve", "resolved", "remedy"],
];

const ROLE_RE = /^(system|developer|user|assistant|tool|function)\s*:/i;
const CRITICAL_RE = /\b(must|never|always|required|critical|important|constraint|do not|don't|cannot|security|warning)\b/i;
const REFERENCE_RE = /\b(it|its|that|this|they|them|those|these|former|latter|above|earlier|same|there|he|him|his|she|her|hers)\b/i;
const NOISE_RE = /\b(debug|heartbeat|telemetry|stack trace|verbose|cache hit|progress|loading|retrying|health check|request completed)\b/i;
const HEADING_RE = /^(#{1,6}\s+|[A-Z][A-Z0-9 _/-]{3,}:?\s*$|\[[^\]]+\]\s*$)/;
const CODE_RE = /(```|^\s{2,}(?:const|let|var|def|class|function|import|from|SELECT|curl|npm|pip)\b|[{}();=>])/m;
const IDENTIFIER_RE = /\b(?:[A-Z][A-Za-z0-9_-]{2,}|[a-z]+_[a-z0-9_]+|[\w@.-]+\.(?:js|jsx|ts|tsx|py|go|rs|md|json|yaml|yml|toml)|\d+(?:[.:/-]\d+)*)\b/g;
const HISTORY_QUERY_RE = /\b(previous|previously|before|old|older|original|history|historical|change|changed|compare|difference|timeline|first|used to)\b/i;

const POLICY_DEFAULTS = {
  precision: { baseRatio: 0.48, highScore: 1.45, floorScore: 0.05 },
  balanced: { baseRatio: 0.34, highScore: 1.85, floorScore: 0.18 },
  frontier: { baseRatio: 0.22, highScore: 2.35, floorScore: 0.35 },
  aggressive: { baseRatio: 0.22, highScore: 2.35, floorScore: 0.35 },
};

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function stem(word) {
  let value = word.toLowerCase();
  if (value.length > 5) {
    value = value.replace(/(ingly|edly|ations|ation|ments|ment|ness|ingly|ing|ers|ies|ied|ed|es|s)$/i, "");
  }
  return value;
}

function rawWords(text) {
  return text.match(/[\p{L}\p{N}_]+/gu) || [];
}

function extractTerms(text) {
  const output = [];
  for (const word of rawWords(text)) {
    const normalized = stem(word);
    if (normalized.length > 1 && !STOP_WORDS.has(normalized)) output.push(normalized);
  }
  return output;
}

export function tokenizeText(text) {
  return extractTerms(String(text || ""));
}

function queryModel(query) {
  const raw = rawWords(query).map((word) => word.toLowerCase());
  const primary = new Set(extractTerms(query));
  const expanded = new Map();

  for (const group of CONCEPTS) {
    if (group.some((word) => raw.includes(word) || primary.has(stem(word)))) {
      for (const word of group) {
        const normalized = stem(word);
        if (!primary.has(normalized)) expanded.set(normalized, 0.32);
      }
    }
  }

  const identifiers = [...new Set((query.match(IDENTIFIER_RE) || []).map((value) => value.toLowerCase()))];
  return { raw, primary, expanded, identifiers, lower: query.trim().toLowerCase() };
}

export function estimateTokens(text) {
  if (!text) return 0;
  const matches = text.match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
  return Math.max(1, Math.ceil(matches.length * 0.78));
}

function splitOversizedBlock(block, maxChars = 2400) {
  if (block.length <= maxChars) return [block];
  const lines = block.split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if (current && current.length + line.length + 1 > maxChars) {
      chunks.push(current);
      current = "";
    }
    if (line.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let offset = 0; offset < line.length; offset += maxChars) {
        chunks.push(line.slice(offset, offset + maxChars));
      }
    } else {
      current += `${current ? "\n" : ""}${line}`;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function segmentContext(context) {
  const normalized = String(context || "").replace(/\r\n?/g, "\n").trim();
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
    const beginsRole = !inFence && ROLE_RE.test(trimmed);
    const beginsDatedRecord =
      !inFence &&
      /^(?:\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?|\[\d{2}:\d{2}(?::\d{2})?\])/.test(trimmed);
    const beginsHeading = !inFence && HEADING_RE.test(trimmed);

    if (current.length && (beginsRole || beginsDatedRecord || beginsHeading)) flush();
    current.push(line);

    if (trimmed.startsWith("```")) inFence = !inFence;
    if (!inFence && !trimmed) flush();
  }
  flush();
  return blocks;
}

function detectRole(text) {
  const match = text.trimStart().match(ROLE_RE);
  return match ? match[1].toLowerCase() : null;
}

function blockHeading(text, index) {
  const first = text.split("\n", 1)[0]
    .replace(/^#{1,6}\s*/, "")
    .replace(ROLE_RE, (_, role) => `${role}: `)
    .trim();
  if (first.length <= 72) return first || `Block ${index + 1}`;
  return `${first.slice(0, 69)}…`;
}

function uniqueTerms(terms) {
  return [...new Set(terms)];
}

function exactFingerprint(text) {
  return text
    .toLowerCase()
    .replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, "<time>")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}_./:@ -]/gu, "")
    .trim();
}

function nearBucket(termSet) {
  const stable = [...termSet]
    .filter((term) => term.length > 2)
    .sort()
    .slice(0, 7);
  return stable.length >= 3 ? stable.slice(0, 3).join("|") : "";
}

function overlapRatio(a, b) {
  if (!a.size || !b.size) return 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = smaller === a ? b : a;
  let intersection = 0;
  for (const term of smaller) if (larger.has(term)) intersection++;
  return intersection / Math.min(a.size, b.size);
}

function analyzeBlocks(blockTexts) {
  let exchange = -1;
  let lastConversationalExchange = -1;
  const analyzed = [];

  for (let index = 0; index < blockTexts.length; index++) {
    const text = blockTexts[index];
    const role = detectRole(text);
    if (role === "user") exchange++;
    if (role && exchange < 0) exchange = 0;
    if (role) lastConversationalExchange = exchange;

    const termArray = extractTerms(text);
    const termSet = new Set(termArray);
    analyzed.push({
      index,
      text,
      role,
      exchange: role ? exchange : null,
      termArray,
      termSet,
      identifiers: new Set((text.match(IDENTIFIER_RE) || []).map((value) => value.toLowerCase())),
      tokens: estimateTokens(text),
      heading: blockHeading(text, index),
      isSystem: role === "system" || role === "developer",
      isCode: CODE_RE.test(text),
      isNoise: NOISE_RE.test(text),
      isCritical: CRITICAL_RE.test(text),
      hasReference: REFERENCE_RE.test(text),
      isStandaloneHeading: !text.includes("\n") && HEADING_RE.test(text.trim()),
      score: 0,
      reasons: [],
      primaryMatched: 0,
      duplicateOf: null,
      supersededBy: null,
    });
  }

  return { blocks: analyzed, lastConversationalExchange };
}

function markDuplicates(blocks) {
  const exact = new Map();
  const buckets = new Map();

  for (const block of blocks) {
    const fingerprint = exactFingerprint(block.text);
    const priorExact = fingerprint.length > 12 ? exact.get(fingerprint) : undefined;
    if (priorExact !== undefined) {
      if (!block.role) block.duplicateOf = priorExact;
      continue;
    }
    if (fingerprint.length > 12) exact.set(fingerprint, block.index);

    const key = nearBucket(block.termSet);
    if (!key) continue;
    const candidates = buckets.get(key) || [];
    for (let offset = candidates.length - 1, checked = 0; offset >= 0 && checked < 6; offset--, checked++) {
      const candidate = blocks[candidates[offset]];
      if (
        Math.max(candidate.termSet.size, block.termSet.size) >= 5 &&
        overlapRatio(candidate.termSet, block.termSet) >= 0.9
      ) {
        block.duplicateOf = candidate.index;
        break;
      }
    }
    if (block.duplicateOf === null) {
      candidates.push(block.index);
      if (candidates.length > 12) candidates.shift();
      buckets.set(key, candidates);
    }
  }
}

function markSupersededChatExchanges(blocks, query, lastExchange) {
  if (HISTORY_QUERY_RE.test(query.lower) || lastExchange <= 0) return;
  const exchanges = new Map();

  for (const block of blocks) {
    if (block.exchange === null || block.exchange === lastExchange) continue;
    const entry = exchanges.get(block.exchange) || { indices: [], terms: new Set(), matched: new Set() };
    entry.indices.push(block.index);
    for (const term of block.termSet) entry.terms.add(term);
    for (const term of query.primary) if (block.termSet.has(term)) entry.matched.add(term);
    exchanges.set(block.exchange, entry);
  }

  const latestByTopic = new Map();
  for (const [exchangeId, exchange] of [...exchanges.entries()].sort((a, b) => b[0] - a[0])) {
    if (!exchange.matched.size) continue;
    const topic = [...exchange.matched].sort().join("|");
    const latest = latestByTopic.get(topic);
    if (
      latest &&
      overlapRatio(exchange.terms, latest.terms) >= 0.42
    ) {
      for (const index of exchange.indices) {
        blocks[index].supersededBy = latest.id;
        blocks[index].score -= 20;
        blocks[index].reasons.push("superseded by a newer conversation update");
      }
    } else {
      latestByTopic.set(topic, { id: exchangeId, terms: exchange.terms });
    }
  }
}

function documentFrequency(blocks, query) {
  const relevantTerms = new Set([...query.primary, ...query.expanded.keys()]);
  const frequency = new Map();
  for (const block of blocks) {
    for (const term of block.termSet) {
      if (relevantTerms.has(term)) frequency.set(term, (frequency.get(term) || 0) + 1);
    }
  }
  return frequency;
}

function scoreBlocks(blocks, query, lastExchange) {
  const df = documentFrequency(blocks, query);
  const documentCount = Math.max(1, blocks.length);

  for (const block of blocks) {
    if (block.isSystem) {
      block.score = 100;
      block.reasons.push("system or developer instruction");
      continue;
    }

    let primaryMatched = 0;
    let lexical = 0;
    for (const term of query.primary) {
      if (!block.termSet.has(term)) continue;
      primaryMatched++;
      const idf = Math.log(1 + (documentCount - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));
      lexical += Math.min(2.5, idf);
    }
    for (const [term, weight] of query.expanded) {
      if (!block.termSet.has(term)) continue;
      const idf = Math.log(1 + (documentCount - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));
      lexical += Math.min(1.2, idf * weight);
    }

    block.primaryMatched = primaryMatched;
    const coverage = query.primary.size ? primaryMatched / query.primary.size : 0;
    block.score = lexical + coverage * 4.5;

    if (coverage >= 0.5) block.reasons.push("strong query match");
    else if (primaryMatched) block.reasons.push("matches query terms");

    const lower = block.text.toLowerCase();
    if (query.lower.length >= 8 && lower.includes(query.lower)) {
      block.score += 6;
      block.reasons.unshift("contains the exact query");
    }

    let identifierHits = 0;
    for (const identifier of query.identifiers) {
      if (lower.includes(identifier)) identifierHits++;
    }
    if (identifierHits) {
      block.score += identifierHits * 2.8;
      block.reasons.push("preserves named evidence");
    }

    if (block.isCritical && (primaryMatched || block.index === 0)) {
      block.score += 2;
      block.reasons.push("instruction or constraint");
    }
    if (block.isCode && (primaryMatched || /\b(code|function|class|api|error|file|implement|return|test)\b/i.test(query.lower))) {
      block.score += 1.5;
      block.reasons.push("relevant code structure");
    }
    if (block.role && block.exchange === lastExchange) {
      block.score += block.role === "user" ? 1.4 : 0.55;
      block.reasons.push("current conversation exchange");
    } else if (block.role && lastExchange - block.exchange <= 2) {
      block.score += 0.25;
    }
    if (block.isNoise && !primaryMatched && !identifierHits) {
      block.score -= 1.8;
      block.reasons.push("low-signal operational noise");
    }
    if (block.duplicateOf !== null) {
      block.score -= 20;
      block.reasons.push("duplicate of earlier context");
    }
  }
}

function adaptiveRatio(originalTokens, configured, policy) {
  if (Number.isFinite(configured)) return Math.min(0.9, Math.max(0.08, configured));
  const base = POLICY_DEFAULTS[policy].baseRatio;
  if (originalTokens < 160) return Math.max(base, 0.55);
  if (originalTokens < 1_000) return Math.max(base, 0.42);
  if (originalTokens > 100_000) return Math.min(base, 0.2);
  if (originalTokens > 20_000) return Math.min(base, 0.24);
  return base;
}

function addConversationDependencies(blocks, keep, lastExchange) {
  const exchanges = new Map();
  for (const block of blocks) {
    if (block.exchange === null) continue;
    const indices = exchanges.get(block.exchange) || [];
    indices.push(block.index);
    exchanges.set(block.exchange, indices);
  }

  for (const index of [...keep]) {
    const block = blocks[index];
    if (block.exchange === null) continue;
    const exchangeIndices = exchanges.get(block.exchange) || [];
    const historical = block.exchange < lastExchange;

    if (historical) {
      const user = exchangeIndices.find((candidate) => blocks[candidate].role === "user");
      const assistant = exchangeIndices.find((candidate) => blocks[candidate].role === "assistant");
      if (user !== undefined) keep.add(user);
      if (assistant !== undefined) keep.add(assistant);
    }

    if (block.role === "tool" || block.role === "function") {
      const assistant = [...exchangeIndices]
        .reverse()
        .find((candidate) => candidate < index && blocks[candidate].role === "assistant");
      if (assistant !== undefined) keep.add(assistant);
    }
  }
}

function addStructuralDependencies(blocks, keep) {
  for (const index of [...keep]) {
    const block = blocks[index];
    const previous = blocks[index - 1];
    const next = blocks[index + 1];

    if (previous && previous.duplicateOf === null && previous.supersededBy === null) {
      if (previous.isStandaloneHeading) keep.add(previous.index);
      if (
        block.hasReference &&
        previous.role &&
        (
          previous.exchange === block.exchange ||
          block.role === null ||
          (block.role === "user" && previous.exchange === block.exchange - 1)
        )
      ) {
        keep.add(previous.index);
      }
      if (
        block.identifiers.size &&
        [...block.identifiers].some((identifier) => previous.identifiers.has(identifier)) &&
        previous.score > 0
      ) {
        keep.add(previous.index);
      }
    }

    if (next && next.duplicateOf === null && next.supersededBy === null) {
      if (next.hasReference && (block.role === null || next.exchange === block.exchange)) {
        keep.add(next.index);
      }
      if (
        block.identifiers.size &&
        [...block.identifiers].some((identifier) => next.identifiers.has(identifier)) &&
        next.score > 0
      ) {
        keep.add(next.index);
      }
    }
  }
}

function selectBlocks(blocks, originalTokens, options, lastExchange) {
  const policy = options.policy in POLICY_DEFAULTS ? options.policy : "frontier";
  const defaults = POLICY_DEFAULTS[policy];
  const ratio = adaptiveRatio(originalTokens, options.budgetRatio, policy);
  const targetTokens = Math.max(24, Math.round(originalTokens * ratio));
  const keep = new Set();
  let selectedTokens = 0;

  for (const block of blocks) {
    if (block.isSystem) {
      keep.add(block.index);
      selectedTokens += block.tokens;
    }
  }

  const ranked = blocks
    .filter((block) => block.duplicateOf === null && block.supersededBy === null && !block.isSystem)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  for (const block of ranked) {
    const highConfidence = block.score >= defaults.highScore;
    const hasBudget = selectedTokens < targetTokens && block.score >= defaults.floorScore;
    if (highConfidence || hasBudget) {
      keep.add(block.index);
      selectedTokens += block.tokens;
    }
  }

  if (!keep.size && ranked.length) keep.add(ranked[0].index);

  addStructuralDependencies(blocks, keep);
  addConversationDependencies(blocks, keep, lastExchange);
  return { keep, ratio, policy };
}

function makeNoopResult(context, blocks, query, started, risk = "low") {
  const originalTokens = estimateTokens(context);
  const annotations = blocks.map((text, index) => ({
    index,
    text,
    kept: true,
    score: 1,
    reason: "already minimal; preserved exactly",
  }));
  return {
    compressedText: context,
    originalTokens,
    keptTokens: originalTokens,
    tokensSaved: 0,
    savingsPercent: 0,
    importantKeptPercent: 100,
    risk,
    latencyMs: now() - started,
    keptBlocks: annotations.map(({ index, reason }) => ({ index, heading: blockHeading(blocks[index], index), reason })),
    droppedBlocks: [],
    annotations,
    policy: "MarsCompress/noop-v2",
    queryCoveragePercent: query.trim() ? 100 : 0,
    fallbackApplied: false,
    fallbackReason: null,
  };
}

function compileBlocks(originalContext, blockTexts, queryText, options = {}) {
  const started = now();
  const originalTokens = estimateTokens(originalContext);

  if (!originalContext) return makeNoopResult(originalContext, [], queryText, started);
  if (!queryText.trim()) return makeNoopResult(originalContext, blockTexts, queryText, started, "medium");
  if (blockTexts.length <= 1 || originalTokens <= 16) {
    return makeNoopResult(originalContext, blockTexts, queryText, started);
  }

  const query = queryModel(queryText);
  const { blocks, lastConversationalExchange } = analyzeBlocks(blockTexts);
  markDuplicates(blocks);
  scoreBlocks(blocks, query, lastConversationalExchange);
  markSupersededChatExchanges(blocks, query, lastConversationalExchange);
  const { keep, policy } = selectBlocks(blocks, originalTokens, options, lastConversationalExchange);

  const compressedText = blocks
    .filter((block) => keep.has(block.index))
    .map((block) => block.text)
    .join("\n\n");
  const keptTokens = estimateTokens(compressedText);
  const tokensSaved = Math.max(0, originalTokens - keptTokens);
  const savingsPercent = originalTokens ? (tokensSaved / originalTokens) * 100 : 0;

  const important = blocks.filter((block) => block.isSystem || block.score >= 1.85);
  const importantKept = important.filter((block) => keep.has(block.index)).length;
  const importantKeptPercent = important.length ? (importantKept / important.length) * 100 : 100;

  const contextPrimary = new Set();
  const keptPrimary = new Set();
  for (const block of blocks) {
    for (const term of query.primary) {
      if (block.termSet.has(term)) {
        contextPrimary.add(term);
        if (keep.has(block.index)) keptPrimary.add(term);
      }
    }
  }
  const queryCoveragePercent = contextPrimary.size ? (keptPrimary.size / contextPrimary.size) * 100 : 100;
  const droppedHighScore = blocks.some((block) => !keep.has(block.index) && block.score >= 2.35);
  const missingSystem = blocks.some((block) => block.isSystem && !keep.has(block.index));
  const risk =
    missingSystem || importantKeptPercent < 99 || queryCoveragePercent < 100
      ? "high"
      : droppedHighScore || savingsPercent > 90 || query.primary.size < 2
        ? "medium"
        : "low";

  const annotations = blocks.map((block) => ({
    index: block.index,
    text: block.text,
    kept: keep.has(block.index),
    score: Number(block.score.toFixed(3)),
    reason: keep.has(block.index)
      ? block.reasons[0] || "selected within relevance budget"
      : block.duplicateOf !== null
        ? "duplicate context removed"
        : block.supersededBy !== null
          ? "superseded by newer conversation context"
        : block.reasons.includes("low-signal operational noise")
          ? "low-signal operational noise"
          : "low relevance to current query",
  }));

  const result = {
    compressedText,
    originalTokens,
    keptTokens,
    tokensSaved,
    savingsPercent,
    importantKeptPercent,
    risk,
    latencyMs: now() - started,
    keptBlocks: annotations.filter((block) => block.kept).map(({ index, reason }) => ({
      index,
      heading: blocks[index].heading,
      reason,
    })),
    droppedBlocks: annotations.filter((block) => !block.kept).map(({ index, reason }) => ({
      index,
      heading: blocks[index].heading,
      reason,
    })),
    annotations,
    policy: `MarsCompress/${policy}-v2`,
    queryCoveragePercent,
    fallbackApplied: false,
    fallbackReason: null,
  };

  if (risk === "high" && options.fallbackOnHighRisk) {
    return {
      ...result,
      compressedText: originalContext,
      keptTokens: originalTokens,
      tokensSaved: 0,
      savingsPercent: 0,
      fallbackApplied: true,
      fallbackReason: "high verifier risk",
      candidateCompressedText: compressedText,
      potentialSavingsPercent: savingsPercent,
    };
  }

  return result;
}

export function compressContext(context, query, options = {}) {
  if (typeof context !== "string" || typeof query !== "string") {
    throw new TypeError("context and query must be strings");
  }
  return compileBlocks(context, segmentContext(context), query, options);
}

export function compressMessages(messages, query, options = {}) {
  if (!Array.isArray(messages) || typeof query !== "string") {
    throw new TypeError("messages must be an array and query must be a string");
  }
  const normalized = messages.map((message, index) => {
    if (!message || typeof message.role !== "string" || typeof message.content !== "string") {
      throw new TypeError(`message ${index} must contain string role and content fields`);
    }
    return {
      role: message.role.toLowerCase(),
      content: message.content,
      text: `${message.role.toUpperCase()}: ${message.content}`,
    };
  });
  const context = normalized.map((message) => message.text).join("\n\n");
  const result = compileBlocks(context, normalized.map((message) => message.text), query, options);
  const keptIndices = new Set(result.annotations.filter((annotation) => annotation.kept).map((annotation) => annotation.index));
  return {
    ...result,
    messages: normalized
      .filter((_, index) => keptIndices.has(index))
      .map(({ role, content }) => ({ role, content })),
  };
}
