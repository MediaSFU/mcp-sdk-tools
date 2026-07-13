import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import {
  actionCatalog,
  buildActionTools,
  createActionMcpServer,
  validateActionCredential
} from './mcp-actions.mjs';

const disposableKey = `tempsand${'a'.repeat(56)}`;
const authorization = `Bearer testuser:${disposableKey}`;

let sessionRequest;
const sessionFetch = async (url, options) => {
  sessionRequest = { url: String(url), options };
  return new Response(JSON.stringify({
    success: true,
    username: 'testuser',
    allowedOperations: ['createRoom'],
    actionTools: [{ name: 'mediasfu_create_room', operation: 'createRoom' }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const session = await validateActionCredential({
  authorization,
  apiBase: 'https://api.example.test',
  origin: 'https://mcp.mediasfu.com',
  fetchImpl: sessionFetch
});
assert.equal(session.username, 'testuser');
assert.equal(sessionRequest.url, 'https://api.example.test/v1/mcp/session');
assert.equal(sessionRequest.options.headers.Authorization, authorization);
assert.equal(sessionRequest.options.headers.Origin, 'https://mcp.mediasfu.com');
assert.equal(sessionRequest.options.method, 'POST');

await assert.rejects(
  validateActionCredential({
    authorization: `Bearer ${disposableKey}`,
    apiBase: 'https://api.example.test',
    fetchImpl: sessionFetch
  }),
  /Bearer <username>:<disposableKey>/
);
await assert.rejects(
  validateActionCredential({
    authorization,
    apiBase: 'http://api.example.test',
    fetchImpl: sessionFetch
  }),
  /must use HTTPS/
);

const filtered = buildActionTools(['mediasfu_create_room']);
assert.deepEqual(filtered.map((tool) => tool.name), ['mediasfu_create_room']);
assert.equal(filtered[0].inputSchema.additionalProperties, false);
assert.deepEqual(filtered[0].inputSchema.required, ['userName', 'eventType', 'durationMinutes', 'capacity']);
assert.deepEqual(
  actionCatalog
    .filter(({ operation }) => ['createEventSettings', 'updateEventSettings'].includes(operation))
    .map(({ operation }) => operation),
  ['createEventSettings', 'updateEventSettings']
);
assert.equal(
  actionCatalog.some(({ operation }) =>
    ['updateRoom', 'createEvent', 'updateEvent', 'deleteEvent', 'deleteEventSettings'].includes(operation)
  ),
  false
);
assert.deepEqual(
  buildActionTools(['mediasfu_create_event_settings', 'mediasfu_update_event_settings'])
    .map((tool) => tool.name),
  ['mediasfu_create_event_settings', 'mediasfu_update_event_settings']
);

let actionRequests = [];
const actionFetch = async (url, options) => {
  actionRequests.push({ url: String(url), options });
  return new Response(JSON.stringify({
    success: true,
    roomName: 'sroom123',
    leaked: disposableKey
  }), { status: 201, headers: { 'content-type': 'application/json' } });
};
const server = createActionMcpServer({
  authorization,
  allowedToolNames: ['mediasfu_create_room', 'mediasfu_create_event_settings'],
  apiBase: 'https://api.example.test',
  fetchImpl: actionFetch
});
const client = new Client({ name: 'mediasfu-action-test', version: '1.0.0' }, { capabilities: {} });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
await client.connect(clientTransport);

const preview = await client.callTool({
  name: 'mediasfu_create_room',
  arguments: {
    userName: 'Host',
    eventType: 'conference',
    durationMinutes: 30,
    capacity: 10
  }
});
assert.equal(preview.isError, false);
assert.equal(JSON.parse(preview.content[0].text).status, 'confirmation_required');
assert.equal(actionRequests.length, 0, 'preview must not call MediaSFU');

const created = await client.callTool({
  name: 'mediasfu_create_room',
  arguments: {
    userName: 'Host',
    eventType: 'conference',
    durationMinutes: 30,
    capacity: 10,
    confirm: true
  }
});
assert.equal(created.isError, false);
assert.equal(actionRequests.length, 1);
assert.equal(actionRequests[0].url, 'https://api.example.test/v1/rooms');
assert.equal(actionRequests[0].options.headers.Authorization, authorization);
assert.deepEqual(JSON.parse(actionRequests[0].options.body), {
  action: 'create',
  userName: 'Host',
  eventType: 'conference',
  duration: 30,
  capacity: 10
});
assert.doesNotMatch(created.content[0].text, new RegExp(disposableKey));
assert.match(created.content[0].text, /tempsand\*\*\*redacted\*\*\*/);

const eventSettingsCreated = await client.callTool({
  name: 'mediasfu_create_event_settings',
  arguments: {
    type: 'conference',
    itemPageLimit: 12,
    audioSetting: 'approval',
    confirm: true
  }
});
assert.equal(eventSettingsCreated.isError, false);
assert.equal(actionRequests.length, 2);
assert.equal(actionRequests[1].url, 'https://api.example.test/v1/eventssettings');
assert.deepEqual(JSON.parse(actionRequests[1].options.body), {
  action: 'create',
  itemPageLimit: 12,
  type: 'conference',
  audioSetting: 'approval'
});

const denied = await client.callTool({
  name: 'mediasfu_delete_room',
  arguments: { meetingID: 'sroom123', confirm: true }
});
assert.equal(denied.isError, true);
assert.equal(JSON.parse(denied.content[0].text).error, 'tool_not_allowed');
assert.equal(actionRequests.length, 2);
await client.close();

console.log(JSON.stringify({
  status: 'success',
  checks: [
    'exact-bearer-credential-format',
    'https-api-base',
    'session-scope-filtering',
    'stable-operation-catalog',
    'canonical-event-settings-actions',
    'explicit-confirmation-gate',
    'fixed-backend-route',
    'authorization-forwarding',
    'credential-redaction',
    'unscoped-tool-denial'
  ]
}, null, 2));
