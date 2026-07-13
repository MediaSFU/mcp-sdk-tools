# MediaSFU backend integration contract

This reference describes the public contract that SDK integrations should use. Treat the deployed API base as configuration; append the paths below instead of inventing an `api.mediasfu.com` host.

## Credential boundary

Never embed a long-lived MediaSFU API key in browser, mobile, desktop, Unity, or shipped application code. Keep it in your backend secret store.

Long-lived server authentication uses:

```http
Authorization: Bearer <apiUserName>:<apiKey>
```

For a shipped client that must communicate directly, create a short-lived disposable key from your backend. Limit its allowed domains, expiry, and operations. Disposable key prefixes are `tempsand` for sandbox and `tempprod` for production. A disposable key is still sensitive and must not be logged.

## Supported REST paths

- `POST /v1/rooms` — create a room; a disposable key must allow `createRoom`.
- `GET /v1/rooms` — list rooms for the authenticated account.
- `POST /v1/eventssettings` — create or update event settings; disposable-key operations are checked per action.
- `GET /v1/eventssettings` — read event settings.
- `POST /v1/disposable-keys` — create, update, or revoke a disposable key from a trusted backend.
- `GET /v1/disposable-keys` — list disposable keys.
- `GET /v1/disposable-keys/usage?name=<name>` — usage by key name.
- `GET /v1/disposable-keys/<keyId>/usage` — usage by key ID.
- `GET /v1/disposable-keys-quota` — account disposable-key quota.

Always prefer the SDK's create/join helpers when available because they normalize request and response fields for that platform.

## Recommended topology

1. The app authenticates to your backend using your normal user session.
2. Your backend validates the user, room intent, capacity, and product limits.
3. Your backend either calls MediaSFU directly or returns a tightly scoped disposable key.
4. The client initializes the MediaSFU SDK with the returned room/session data.
5. Your backend records a correlation ID, never credentials or room secrets.

## Proxy controls

- Allowlist accepted request fields and reject unknown fields.
- Rate-limit by authenticated user and IP.
- Enforce room ownership and tenant boundaries.
- Set request/connect/read timeouts and retry only transient failures.
- Do not retry authentication, validation, quota, or other permanent 4xx failures.
- Redact `Authorization`, API keys, disposable keys, room secrets, cookies, and tokens.
- Return stable application error codes plus a correlation ID; do not return stack traces.
- Use HTTPS in production and restrict disposable keys to explicit production domains.

## MCP boundary

The public hosted MediaSFU MCP server is documentation and planning infrastructure. It is read-only and should never receive customer MediaSFU credentials. Use a trusted local stdio MCP process for explicitly enabled scaffolding or command execution.

## Go-live checklist

- First create and join flows pass in sandbox.
- Long-lived credentials exist only in the backend secret store.
- Production uses scoped disposable keys wherever clients need direct access.
- Request payloads, rate limits, timeouts, and error mappings are tested.
- Camera/microphone permissions and HTTPS are verified on physical target devices.
- Logs contain correlation IDs and contain no secrets.
- Room API 4xx and 5xx responses are handled without hanging the request.
