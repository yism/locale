# Security Policy

## Reporting a vulnerability

Please do not open public GitHub issues for security vulnerabilities.

If the GitHub repository has private vulnerability reporting enabled, use that
channel first. Otherwise, report the issue privately to the maintainer at
[@yism](https://github.com/yism).

Include:

- a clear description of the issue
- affected version or commit
- reproduction steps or a proof of concept
- impact assessment
- any suggested remediation if you have one

## Response expectations

We aim to acknowledge credible reports promptly, validate impact, and publish a
fix or mitigation path as quickly as practical.

## Scope notes

Locale is an agent policy layer. Reports are highest priority when they affect:

- capability issuance
- offline verification
- local preflight behavior
- policy evaluation outcomes
- transcript or attestation integrity
- transport behavior that changes the effective trust boundary

Reports that require turning Locale into an executor, secret broker, or
orchestrator are out of scope for this repository's intended product boundary.
