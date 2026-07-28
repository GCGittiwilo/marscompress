const background = {
  support: [
    "## Product feedback\nThe customer requested a darker dashboard theme and CSV export.",
    "## Usage\nThe workspace created 18 reports and viewed analytics 42 times this month.",
    "## Marketing consent\nNewsletter status: unsubscribed. Last campaign opened in March.",
    "## Tool trace\n[debug] cache hit\n[debug] request completed in 91ms",
  ],
  rag: [
    "# Themes\nThe dashboard offers light and dark themes.",
    "# Audit logs\nEnterprise workspaces retain audit events for 365 days.",
    "# Webhooks\nWebhook retries use exponential backoff for 24 hours.",
    "# Regions\nData residency is available in the US and EU.",
  ],
  code: [
    "## Git status\nM package-lock.json\nM docs/installation.md",
    "## README\nThe setup guide uses pnpm in every example.",
    "## Test trace\n[debug] loaded 42 fixtures\n[debug] cache hit",
    "## Styling\nThe button component now accepts a compact prop.",
  ],
  incident: [
    "## Routine deploy\nThe documentation site deployed successfully at 09:00 UTC.",
    "## Metrics\nImage processing stayed below 20% CPU for the entire window.",
    "## Notifications\nThe weekly digest was delivered to 1,204 recipients.",
    "## Debug trace\n[debug] health check 200\n[debug] cache hit",
  ],
  policy: [
    "## Office access\nVisitors must wear a badge while on site.",
    "## Equipment\nLaptops are refreshed on a three-year cycle.",
    "## Expenses\nMeal receipts are required above $25.",
    "## Revision history\nTypography was updated in revision 8.",
  ],
  chat: [
    "User: Can the dashboard use a darker theme?\nAssistant: Yes, choose dark mode in settings.",
    "User: Thanks for the earlier explanation.\nAssistant: You are welcome.",
    "Tool: search completed with 18 unrelated results.",
    "Assistant: The weekly report is also available as a CSV.",
  ],
};

function fixture(id, domain, query, evidence, extras = []) {
  return {
    id,
    domain,
    query,
    evidence,
    context: [
      "SYSTEM: Answer only from the supplied context. Never invent missing values.",
      ...background[domain],
      ...extras,
      `## Answer evidence\n${evidence.join("\n")}`,
      "## Repeated telemetry\n[debug] cache hit\n[debug] request completed",
    ].join("\n\n"),
  };
}

export const fixtures = [
  fixture("support-plan", "support", "What plan and seat count does Acme Bikes have?", ["Account: Acme Bikes", "Plan: Pro", "Seats: 12"]),
  fixture("support-payment", "support", "Why did the July 18 payment fail?", ["July 18 payment: declined", "Reason: insufficient funds"]),
  fixture("support-renewal", "support", "When does the Northwind subscription renew?", ["Account: Northwind", "Renewal date: August 14"]),
  fixture("support-owner", "support", "Who owns the Globex support escalation?", ["Escalation: Globex login issue", "Owner: Priya N."]),

  fixture("rag-key-rotation", "rag", "How can an API key be rotated without downtime?", ["Create the replacement key before revoking the old key.", "Keep both keys active during deployment."]),
  fixture("rag-rate-limit", "rag", "What is the API rate limit for the Pro plan?", ["Pro API rate limit: 600 requests per minute."]),
  fixture("rag-retention", "rag", "How long are deleted files recoverable?", ["Deleted files remain recoverable for 30 days."]),
  fixture("rag-sso", "rag", "Which SSO protocols are supported?", ["Supported SSO protocols: SAML 2.0 and OpenID Connect."]),

  fixture("code-null", "code", "Why does parseInvoice return null for invoice 1042?", ['Invoice 1042 has customer_id="cus_7" but customerId is undefined.', "parseInvoice returns null when customerId is missing."]),
  fixture("code-timeout", "code", "Which request times out and after how long?", ["POST /v2/export times out after 30 seconds."]),
  fixture("code-file", "code", "Which file defines normalizeUser?", ["normalizeUser is defined in src/users/normalize.ts."]),
  fixture("code-test", "code", "Why is the cache test failing?", ["The cache test expects 60 seconds, but CACHE_TTL is 30 seconds."]),

  fixture("incident-root-cause", "incident", "What caused the checkout outage?", ["Root cause: the payments connection pool was exhausted."]),
  fixture("incident-start", "incident", "When did elevated errors begin?", ["Elevated errors began at 14:32 UTC."]),
  fixture("incident-owner", "incident", "Who owns the database follow-up?", ["Database follow-up owner: Mateo R."]),
  fixture("incident-fix", "incident", "How was the queue incident mitigated?", ["Mitigation: workers were increased from 8 to 24."]),

  fixture("policy-retention", "policy", "How long must customer invoices be retained?", ["Customer invoices must be retained for seven years."]),
  fixture("policy-approval", "policy", "Who must approve production database access?", ["Production database access requires Security and Engineering VP approval."]),
  fixture("policy-delete", "policy", "When must export files be deleted?", ["Export files must be deleted within 24 hours."]),
  fixture("policy-contract", "policy", "What is the contract termination notice period?", ["Contract termination requires 60 days written notice."]),

  fixture("chat-preference", "chat", "What language does the user prefer?", ["User preference: respond in German."]),
  fixture("chat-decision", "chat", "Which database did the team choose?", ["Team decision: use PostgreSQL for the event store."]),
  fixture("chat-deadline", "chat", "When is the launch review?", ["Launch review: Friday at 10:30 CET."]),
  fixture("chat-name", "chat", "What should the assistant call the user?", ["User says: Please call me Sam."]),
];

