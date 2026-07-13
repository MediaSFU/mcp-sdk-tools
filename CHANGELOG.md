# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/).
## 1.0.1 - 2026-07-13

- Add an authenticated Streamable HTTP action endpoint backed by disposable-key
  operation scopes while keeping the public MCP endpoint read-only.
- Add room lifecycle, event-settings create/update, and SIP call-control tools.
- Use the canonical `createEventSettings` and `updateEventSettings` operation
  names; no event-settings delete action is exposed.
- Add hardened deployment examples and action-endpoint security coverage.


## 1.0.0 - 2026-07-13

- Publish the first stable public release of the official MediaSFU MCP toolkit.
- Cover 10 SDK/runtime surfaces with 138 public tools and 168 maintainer tools.
- Add versioned SDK capability evidence, reference search, integration planning,
  diagnostics, security guidance, and safe scaffolding.
- Provide matching stdio and Streamable HTTP transports.
- Keep public hosted mode read-only with authentication, host validation, request
  rate limiting, bounded sessions, and secret redaction.
- Add production patterns for headless applications, widgets, telephony, AI call
  control, lifecycle cleanup, credential brokering, and backend integration.
- Add cross-SDK release, coverage, production, scaffold, and security gates.
- Add hardened standalone deployment examples for Nginx and systemd.
