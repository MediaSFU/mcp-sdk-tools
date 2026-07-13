# Local MCP Setup

This guide connects the published MediaSFU MCP toolkit to an MCP-capable client.
The stdio transport is the recommended local default because it binds no port
and requires no bearer token.

## Prerequisites

- Node.js 20 or newer
- npm with access to the public npm registry
- an MCP client that supports stdio servers

No MediaSFU API key, room secret, customer credential, or MCP bearer token is
required for the local read-only tool surface.

## Recommended client configuration

Pin the current major version so patch and minor fixes arrive without silently
crossing a future breaking release:

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

On Windows, set `command` to `npx.cmd` if the client does not resolve npm's
Windows command shim. Restart the MCP client after changing its configuration.

## Global installation alternative

```bash
npm install --global @mediasfu/mcp-sdk-tools@1
mediasfu-mcp
```

The package exposes these commands:

- `mcp-sdk-tools` and `mediasfu-mcp`: stdio MCP server
- `mediasfu-mcp-http`: local Streamable HTTP server

## Validate an installation

```bash
npx -y --package @mediasfu/mcp-sdk-tools@1 mediasfu-mcp --self-test
npx -y --package @mediasfu/mcp-sdk-tools@1 mediasfu-mcp-http --self-test
```

Expected properties include `status: "success"`, `sdkCount: 10`, and
`toolCount: 138`.

## Optional local HTTP transport

```bash
npx -y --package @mediasfu/mcp-sdk-tools@1 mediasfu-mcp-http
```

The defaults are:

- public read-only MCP endpoint: `http://127.0.0.1:3333/mcp`
- disposable-key action endpoint: `http://127.0.0.1:3333/mcp/actions`
- health endpoint: `http://127.0.0.1:3333/healthz`

The server refuses an unauthenticated non-loopback binding. Use the hardened
standalone baseline in [`server/README.md`](server/README.md) for any shared
deployment. Do not expose the development listener directly to the internet.

The managed public endpoint is `https://mcp.mediasfu.com/mcp` and requires no
credentials. The action endpoint is `https://mcp.mediasfu.com/mcp/actions` and
requires `Authorization: Bearer <username>:<disposableKey>`. Keep that credential
in client secret storage and grant the disposable key only the needed operations.

## Safe execution defaults

- Scaffolding is a dry run unless `apply: true` is explicit.
- Apply mode writes only below the selected project root and rejects traversal.
- Existing files are preserved unless `overwrite: true` is explicit.
- Command execution and npm-script adapters require explicit execute input.
- Secrets are redacted from runtime output fields.
- Public/shared HTTP mode should remain read-only.

## Tool naming

Tools use `sdkId::toolId`, for example:

- `reactjs::integration.plan`
- `angular::app.scaffold`
- `flutter::feature.map`
- `kotlin::runtime.diagnose`
- `swift::integration.plan`
- `unity::room.bootstrap`
- `shared::backend.integration.guide`

## Maintainer source validation

From a source checkout:

```bash
npm ci
npm run release:check
npm run pack:dry-run
npm audit --omit=dev
```

See [`README.md`](README.md) for the tool surface and [`SECURITY.md`](SECURITY.md)
for vulnerability reporting and deployment boundaries.
