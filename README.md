# MediaSFU MCP Integration Toolkit

The official MediaSFU MCP toolkit helps developers and MCP-capable agents plan, scaffold, diagnose, and harden MediaSFU frontend and backend integrations.

Run the stdio server directly with npm:

```bash
npx -y @mediasfu/mcp-sdk-tools
```

For repeatable MCP client configuration, pin the supported major version:

```json
{
  "mcpServers": {
    "mediasfu": {
      "command": "npx",
      "args": ["-y", "@mediasfu/mcp-sdk-tools@1"]
    }
  }
}
```

On Windows, use `npx.cmd` if the MCP client does not resolve the npm shim. You
can also install globally and run the explicit executable:

```bash
npm install --global @mediasfu/mcp-sdk-tools@1
mediasfu-mcp
```

The `mediasfu-mcp-http` executable starts the optional local Streamable HTTP
transport. See [`LOCAL_MCP_SETUP.md`](LOCAL_MCP_SETUP.md) for client examples.

## Supported SDK surfaces

- shared runtime and backend integration
- ReactJS
- Angular
- React Native
- React Native Expo
- Vue
- Flutter
- Kotlin / Android / KMP
- Swift / Apple platforms
- Unity

The default public surface exposes 138 integration tools. Thirty documentation-build and parity tools are internal; set `MCP_INCLUDE_INTERNAL_TOOLS=1` only in the MediaSFU maintainer workspace to expose the full 168-tool surface.

## Core tools

Every SDK provides:

- `sdk.recommend`
- `app.scaffold`
- `integration.plan`
- `env.preflight`
- `room.bootstrap`
- `feature.map`
- `runtime.diagnose`
- `fix.suggest`
- `api.reference.search`
- `room.flow.explain`
- `ui.mode.recommend`
- `ui.overrides.guide`
- `security.proxy.rooms`

The shared surface adds production patterns derived from MediaSFU's headless, widget, telephony, and AI call-control integrations:

- `shared::frontend.architecture.plan`
- `shared::headless.integration.plan`
- `shared::widget.integration.plan`
- `shared::telephony.call-control.plan`
- `shared::runtime.readiness.diagnose`
- `shared::lifecycle.cleanup.audit`
- `shared::credential.broker.plan`
- `shared::backend.integration.guide`

Tool names use `sdkId::toolId`, for example `reactjs::integration.plan`.

## Capability evidence and SDK freshness

`sdk-registry.json` records the detected package name/version, manifest and reference hashes, and per-SDK evidence topics. `feature.map` returns this as `sdkRelease` and `capabilityEvidence`.

Evidence status is intentionally conservative:

- `documented` means the capability is evidenced in the bundled SDK reference.
- `not-evidenced` means the bundled reference does not prove it; it does not claim the SDK cannot support it.

`npm run registry:check` verifies packaged manifest, reference, and evidence hashes without depending on neighboring folders. In a complete MediaSFU SDK workspace, maintainers additionally run `npm run validate:workspace` and `npm run registry:check:workspace` to detect live package-version drift and unregistered SDKs. Reviewed registry changes are refreshed with `npm run registry:write`.

## Safe scaffolding

Scaffolding is a dry run unless `apply: true` is explicit. Apply mode:

- resolves from `projectRoot`, defaulting to the MCP process working directory;
- writes only below a relative `outputDir`, defaulting to `mediasfu-generated/sdkId`;
- rejects path traversal;
- refuses existing files unless `overwrite: true`;
- emits `MEDIASFU_INTEGRATION.md` with the detected SDK release and runtime checklist;
- never emits long-lived credential placeholders.

ReactJS emits production-pattern TypeScript/React starters based on the live MediaSFU frontend's headless runtime model. Other SDKs emit version-aware implementation recipes where the package API has not been compile-verified by this Node release process. This avoids presenting speculative source as compile-ready code.

Example:

```bash
node ./scripts/mcp-engine.mjs run reactjs app.scaffold --input '{"apply":true,"projectRoot":"/path/to/app","outputDir":"src/mediasfu"}'
```

Obtain scoped room/session material from an authenticated backend. Never put a long-lived MediaSFU API key in browser storage, mobile preferences, source code, logs, or a shipped desktop/mobile/game binary.

## Run locally

```bash
npm install
npm run validate
npm run registry:check
npm run mcp:server:selftest
npm run mcp:http:selftest
npm run release:check
```

Useful examples:

```bash
node ./scripts/mcp-engine.mjs list reactjs
node ./scripts/mcp-engine.mjs run reactjs integration.plan --input '{"appType":"meeting"}'
node ./scripts/mcp-engine.mjs run reactjs api.reference.search --input '{"query":"create room"}'
node ./scripts/mcp-engine.mjs run reactjs feature.map --input '{"requestedFeatures":["conference","screen-share"]}'
node ./scripts/mcp-engine.mjs run shared frontend.architecture.plan --input '{"mode":"auto","needsWidget":true}'
```

## MCP transports

Stdio entry point: `scripts/mcp-stdio-server.mjs`.

Streamable HTTP entry point: `scripts/mcp-http-server.mjs`; the default endpoint is `http://127.0.0.1:3333/mcp`. Override it with `MCP_HOST`, `MCP_PORT`, and `MCP_ENDPOINT`.

Both transports are read-only by default. Local side effects require `MCP_ALLOW_LOCAL_SIDE_EFFECTS=1`. HTTP side effects additionally require `MCP_HTTP_ALLOW_SIDE_EFFECTS=1`. Do not enable side effects for a shared endpoint.

Public HTTP deployments should use TLS, `MCP_AUTH_TOKEN`, host allowlisting, and edge rate limiting. An intentionally unauthenticated public read-only endpoint additionally requires `MCP_ALLOW_UNAUTHENTICATED_PUBLIC=1`.

## Backend boundary

Use `shared::backend.integration.guide` for `/v1/rooms`, event settings, and disposable-key contracts. The MCP service is documentation and developer infrastructure: never send it an API key, disposable key, room secret, cookie, or bearer token.

## Release gate

`npm run release:check` validates:

1. all 10 manifests and critical tools;
2. bundled SDK registry, reference, and evidence drift;
3. matching stdio and HTTP public tool surfaces;
4. all public and internal adapter coverage;
5. input, side-effect, path, redaction, timeout, and HTTP security controls;
6. production architecture, readiness, lifecycle, credential, and evidence behavior;
7. real isolated scaffold writes for all 10 SDKs, including collision refusal and cleanup.

Run `npm run pack:dry-run` and `npm audit` before publication. Publishing is intentionally a separate maintainer action.

Additional public setup notes are in `LOCAL_MCP_SETUP.md`.

## Project links

- Website and developer documentation: [mediasfu.com](https://mediasfu.com)
- Source: [github.com/MediaSFU/mcp-sdk-tools](https://github.com/MediaSFU/mcp-sdk-tools)
- Issues: [github.com/MediaSFU/mcp-sdk-tools/issues](https://github.com/MediaSFU/mcp-sdk-tools/issues)
- Security reports: [SECURITY.md](SECURITY.md)

MediaSFU MCP SDK Tools is released under the [MIT License](LICENSE).
