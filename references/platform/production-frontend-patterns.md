# MediaSFU production frontend patterns

These patterns describe the architecture used by advanced MediaSFU products. They deliberately exclude long-lived credentials from shipped clients.

## Architecture choices

### Prebuilt
Use the SDK room surface and keep application code focused on authentication, navigation, and product state. Best for the fastest first room.

### Hybrid
Keep MediaSFU room orchestration and replace selected cards, controls, panels, or layout through supported overrides. Stabilize create/join before adding overrides.

### Headless
Run MediaSFU without its visible room surface and own the complete product UI. In React-family SDKs this normally means `returnUI={false}`, a stable `sourceParameters` container, `updateSourceParameters`, and programmatic prejoin options. Flutter uses the equivalent `MediasfuParameters` callback model. Native SDKs use their state/controller bridge.

Do not treat the first callback as connected. A useful readiness policy checks:

- a non-empty real room name;
- a usable `socket` or `localSocket` where the SDK exposes them;
- no terminal failure message;
- validated/session state or participants/media state appropriate to the SDK;
- idempotence so callbacks and React strict-mode mounts cannot start the same workflow twice.

## Credential broker

1. The client authenticates to the product backend with its normal session.
2. The backend validates user, tenant, room intent, origin, quota, and requested operations.
3. The backend calls MediaSFU with its long-lived key or issues a short-lived disposable key restricted by expiry, domain, and operations.
4. The client receives only the minimum session material needed for the SDK.
5. Logs contain correlation IDs and never authorization headers, API keys, disposable keys, room secrets, cookies, or tokens.

Never copy the internal long-lived-key `localStorage` pattern into a public application recipe.

## Widget call pattern

A production click-to-call widget is a backend-coordinated integration, not merely an embedded room component.

1. Embed code contains a public widget identifier, never an account API key.
2. The widget sends its key and browser origin to the backend.
3. The backend validates the widget, configured origin, active status, rate limits, and assigned disposable key.
4. The backend creates the call/room and returns safe room connection data.
5. The widget reports end-call state through the widget API.
6. The backend owns call cleanup even if the browser closes without reporting.

Typical headers are `X-Widget-Key` and `X-Widget-Origin`. Treat both as inputs to validate, not proof by themselves.

## Telephony and AI call control

Telephony rooms may add `supportSIP`, direction, codec preference, data buffering, recording policy, and agent configuration to ordinary room creation.

Keep two state channels separate:

- MediaSFU runtime state: room name, socket, local socket, participants, streams, media helpers.
- Product/backend call state: call ID, direction, hold state, recording state, active media source, agent status, transfer state, prompt/music state.

Operations such as hold, resume, start/stop agent, human takeover, transfer, and play-to-all should call authenticated backend endpoints. Use the SDK helper bundle for local media controls such as microphone, camera, device selection, and participant rendering.

If the backend supports events, prefer an event stream over polling. When polling is required, stop it on unmount, visibility changes where appropriate, terminal call state, and call-ID replacement.

## Headless state rules

- Store the latest helper bundle in a stable ref/container to avoid stale closures.
- Derive a small serializable UI state instead of rendering directly from a huge mutable helper object.
- Compare normalized participant snapshots before updating UI state.
- Guard auto-join, auto-unmute, agent startup, and data-buffer startup with one-shot/idempotency refs.
- Check both `socket` and `localSocket` when using local/self-hosted modes.
- Keep room identity updates explicit when a provisional name is replaced by the server room name.
- Never infer connection solely from participant count.

## Media controls

Use exported SDK helpers with the complete current parameters object. Handle permission denial, missing source parameters, and device loss explicitly. UI state should be confirmed from the next SDK state update rather than optimistically assumed forever.

## Lifecycle cleanup

A production integration should clean up:

- polling intervals and retry timers;
- SDK/socket listeners;
- local media tracks and temporary object URLs;
- global callbacks installed for embeds;
- pending fetches through `AbortController` where supported;
- one-shot refs when the room/call identity changes;
- backend room/call state on explicit hangup;
- sensitive in-memory session material after termination.

Cleanup must be idempotent because browser unload, component unmount, socket close, and explicit hangup may race.

## Failure classification

- Authentication/authorization: do not retry without new credentials.
- Validation/unsupported operation: fix the request; do not retry unchanged.
- Quota/rate limit: honor retry metadata and cap attempts.
- Network/socket/5xx: retry with bounded exponential backoff and jitter.
- Media permission/device error: show a user action and re-enumerate devices after permission changes.
- Room ended/rejected: terminate local workflows and cleanup.

## Production acceptance checks

- Long-lived credentials never reach the client bundle, storage, logs, or MCP input.
- Create/join is idempotent under duplicate render and retry.
- Readiness is derived from room identity plus transport/session state.
- Reconnect does not duplicate listeners, media tracks, polling, or agent startup.
- Explicit hangup and unexpected unmount both cleanup safely.
- Widget origin and operation restrictions are enforced server-side.
- Generated code compiles for the declared SDK version.
