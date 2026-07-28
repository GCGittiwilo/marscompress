# Security policy

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in a public issue. Use
GitHub's private vulnerability reporting feature on this repository instead.

Include the affected version, reproduction steps, impact, and any suggested
mitigation. You should receive an acknowledgment within seven days.

## Deployment guidance

The compression library is local and makes no network requests. The included
HTTP API permits cross-origin requests for easy self-hosting; production
operators should add their own authentication, request limits, logging policy,
and network controls at the deployment boundary.
