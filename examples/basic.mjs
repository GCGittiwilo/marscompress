import { compressContext } from "marscompress";

const context = `
SYSTEM: Answer only from the supplied account record.

## Account record
Customer: Acme Bikes
Plan: Pro
Renewal: August 14

## Unrelated notes
The customer requested dark mode and a CSV export.

## Product release notes
The dashboard now supports custom chart colors and scheduled PDF exports.

## Debug trace
Cache lookup completed successfully in 18 ms.
The account-service health check returned HTTP 200.

## Older conversation
The customer previously asked how to invite a teammate.
The assistant explained the workspace invitation flow.

## General documentation
Administrators can rename workspaces from the organization settings page.
Audit log exports are available to enterprise administrators.
`;

const result = compressContext(context, "Which plan is the customer on?", {
  fallbackOnHighRisk: true,
});

console.log(result.compressedText);
console.error({
  saved: `${result.savingsPercent.toFixed(1)}%`,
  risk: result.risk,
  queryCoverage: `${result.queryCoveragePercent.toFixed(1)}%`,
});
