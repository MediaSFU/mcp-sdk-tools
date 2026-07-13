import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';


import { loadManifest, getWorkspaceRoot, runManifestTool } from './mcp-core.mjs';
import { buildMcpTools, createMcpServer } from './mcp-server-factory.mjs';

const root = getWorkspaceRoot();
const manifest = await loadManifest('reactjs', root);
const tools = buildMcpTools([manifest]);
const findTool = (id) => tools.find((tool) => tool.name === `reactjs::${id}`);

for (const tool of tools) {
  assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name} must reject unknown input fields`);
}
assert.deepEqual(findTool('runtime.diagnose').inputSchema.required, ['errorText']);
assert.deepEqual(findTool('api.reference.search').inputSchema.required, ['query']);
assert.deepEqual(findTool('room.flow.explain').inputSchema.properties.mode.enum, ['create', 'join', 'both']);
assert.equal(findTool('app.scaffold').inputSchema.properties.execute, undefined);
assert.equal(findTool('env.preflight').inputSchema.properties.apply, undefined);

const server = createMcpServer({
  root,
  manifests: [manifest],
  allTools: tools,
  readOnly: false,
  allowSideEffects: false
});
const client = new Client({ name: 'mediasfu-security-test', version: '1.0.0' }, { capabilities: {} });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
await client.connect(clientTransport);
const blocked = await client.callTool({
  name: 'reactjs::app.scaffold',
  arguments: { apply: true }
});
assert.equal(blocked.isError, true);
const blockedPayload = JSON.parse(blocked.content[0].text);
assert.match(blockedPayload.summary, /Side effects are disabled/);
assert.equal(blockedPayload.sideEffects, 'none');
await client.close();

const redacted = await runManifestTool({
  manifest,
  toolId: 'runtime.diagnose',
  root,
  input: {
    errorText: 'Authorization: Bearer should-not-survive',
    nested: {
      apiKey: 'secret-key-value',
      profile: { password: 'secret-password' }
    }
  }
});
assert.match(redacted.input.errorText, /Bearer \*\*\*redacted\*\*\*/);
assert.equal(redacted.input.nested.apiKey, '***redacted***');
assert.equal(redacted.input.nested.profile.password, '***redacted***');
assert.doesNotMatch(JSON.stringify(redacted), /should-not-survive|secret-key-value|secret-password/);

const previousTimeout = process.env.MCP_COMMAND_TIMEOUT_MS;
process.env.MCP_COMMAND_TIMEOUT_MS = '1000';
const timeoutManifest = {
  sdkId: 'security-test',
  title: 'Security test',
  toolAdapters: [{
    id: 'timeout.test',
    kind: 'command',
    command: 'node -e "setTimeout(() => {}, 10000)"'
  }]
};
const startedAt = Date.now();
const timed = await runManifestTool({
  manifest: timeoutManifest,
  toolId: 'timeout.test',
  input: { execute: true },
  root
});
if (previousTimeout === undefined) delete process.env.MCP_COMMAND_TIMEOUT_MS;
else process.env.MCP_COMMAND_TIMEOUT_MS = previousTimeout;
assert.equal(timed.status, 'failed');
assert.equal(timed.commandResult.timedOut, true);
assert.equal(timed.commandResult.code, 124);
assert.ok(Date.now() - startedAt < 5000, 'timed-out commands must terminate promptly');

const httpSource = await readFile(new URL('./mcp-http-server.mjs', import.meta.url), 'utf8');
assert.match(httpSource, /app\.set\('trust proxy', 'loopback'\)/);
const initializeStart = httpSource.indexOf('if (!sessionId && isInitializeRequest(req.body))');
const initializeEnd = httpSource.indexOf('res.status(400)', initializeStart);
const initializeBlock = httpSource.slice(initializeStart, initializeEnd);
assert.ok(initializeStart > 0 && initializeEnd > initializeStart);
assert.ok(initializeBlock.indexOf('transports.size >= maxSessions') >= 0);
assert.ok(initializeBlock.indexOf('transports.size >= maxSessions') < initializeBlock.indexOf('createTransport()'));
assert.doesNotMatch(httpSource, /MCP_ALLOW_UNAUTHENTICATED_PUBLIC\s*=\s*['\"]1['\"]/);

console.log(JSON.stringify({
  status: 'success',
  checks: [
    'per-tool-strict-schemas',
    'required-input-fields',
    'deep-secret-redaction',
    'protocol-side-effect-blocking',
    'command-timeout',
    'loopback-proxy-trust',
    'reachable-session-cap'
  ]
}, null, 2));
