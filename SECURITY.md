# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Email
[info@mediasfu.com](mailto:info@mediasfu.com) with:

- the affected package version and transport;
- a concise reproduction or proof of concept;
- the expected and observed behavior; and
- any known impact or mitigations.

Do not include customer data, production credentials, bearer tokens, room
secrets, or API keys. We will acknowledge the report and coordinate a fix and
responsible disclosure when applicable.

## Supported versions

Security fixes are provided for the latest published major release. Upgrade to
the newest patch version before reporting an issue already addressed upstream.

## Deployment boundary

The MCP service is developer tooling. Never give it access to MediaSFU customer
data, application databases, long-lived API keys, cookies, or room secrets.
Shared HTTP deployments must remain read-only, require authentication, bind to a
private listener behind TLS, and enforce host and rate limits. See
the deployment guidance in `LOCAL_MCP_SETUP.md` for the security baseline.
