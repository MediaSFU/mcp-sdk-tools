import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const text = (description, maxLength = 500) => ({
  type: 'string',
  maxLength,
  description
});
const confirmation = {
  type: 'boolean',
  description: 'Set true only after the user explicitly confirms this side effect.'
};
const strictObject = (properties, required = []) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required.length ? { required } : {})
});
const callId = text('MediaSFU SIP Call-ID.', 256);
const EVENT_SETTING_PROPERTIES = {
  subusername: text('Optional subuser whose defaults should be changed.', 120),
  itemPageLimit: { type: 'integer', minimum: 1, maximum: 100000 },
  mediaType: { type: 'string', enum: ['video', 'audio'] },
  addCoHost: { type: 'boolean' },
  targetOrientation: { type: 'string', enum: ['neutral', 'landscape', 'portrait'] },
  targetOrientationHost: { type: 'string', enum: ['neutral', 'landscape', 'portrait'] },
  targetResolution: { type: 'string', enum: ['hd', 'sd', 'QnHD', 'qhd'] },
  targetResolutionHost: { type: 'string', enum: ['hd', 'sd', 'QnHD', 'qhd'] },
  type: { type: 'string', enum: ['chat', 'webinar', 'conference', 'broadcast'] },
  audioSetting: { type: 'string', enum: ['allow', 'approval', 'disallow'] },
  videoSetting: { type: 'string', enum: ['allow', 'approval', 'disallow'] },
  screenshareSetting: { type: 'string', enum: ['allow', 'approval', 'disallow'] },
  chatSetting: { type: 'string', enum: ['allow', 'disallow'] },
  safeRoom: { type: 'boolean' },
  autoStartSafeRoom: { type: 'boolean' },
  safeRoomAction: { type: 'string', enum: ['warn', 'kick', 'ban'] },
  supportSIP: { type: 'boolean' },
  directionSIP: { type: 'string', enum: ['inbound', 'outbound', 'both'] },
  supportTranslation: { type: 'boolean' },
  translationConfigNickName: text('Existing translation configuration nickname.', 50),
  translationOutputMode: { type: 'string', enum: ['audio', 'text-only'] },
  enableAiNotes: { type: 'boolean' },
  aiNotesOnly: { type: 'boolean' },
  supportMaxRoom: { type: 'boolean' },
  supportFlexRoom: { type: 'boolean' },
  webhookUrl: text('Optional HTTP/HTTPS event webhook URL.', 2048),
  webhookSecret: text('Optional event webhook signing secret.', 256)
};
const EVENT_SETTING_FIELDS = Object.keys(EVENT_SETTING_PROPERTIES);

const ACTIONS = [
  {
    name: 'mediasfu_create_room',
    operation: 'createRoom',
    sideEffect: true,
    description: 'Create a MediaSFU room. Gather userName, eventType, durationMinutes, and capacity before asking the user to confirm.',
    inputSchema: strictObject({
      userName: text('Participant/host display name.', 120),
      eventType: { type: 'string', enum: ['chat', 'webinar', 'conference', 'broadcast'] },
      durationMinutes: { type: 'number', minimum: 1, maximum: 1440 },
      capacity: { type: 'integer', minimum: 1, maximum: 100000 },
      secureCode: text('Optional room secure code (minimum 5 characters).', 128),
      scheduledDate: { oneOf: [{ type: 'string', maxLength: 64 }, { type: 'number' }] },
      region: { type: 'string', enum: ['general', 'asia', 'europe', 'us'] },
      safeRoom: { type: 'boolean' },
      safeRoomAction: { type: 'string', enum: ['warn', 'kick', 'ban'] },
      supportSIP: { type: 'boolean' },
      directionSIP: { type: 'string', enum: ['inbound', 'outbound', 'both'] },
      confirm: confirmation
    }, ['userName', 'eventType', 'durationMinutes', 'capacity']),
    request: (input) => ({
      method: 'POST',
      path: '/v1/rooms',
      body: {
        action: 'create',
        userName: input.userName,
        eventType: input.eventType,
        duration: input.durationMinutes,
        capacity: input.capacity,
        ...pick(input, ['secureCode', 'scheduledDate', 'region', 'safeRoom', 'safeRoomAction', 'supportSIP', 'directionSIP'])
      }
    })
  },
  {
    name: 'mediasfu_join_room',
    operation: 'createRoom',
    sideEffect: true,
    description: 'Join an existing MediaSFU room and return its participant URL.',
    inputSchema: strictObject({
      meetingID: text('Room name beginning with d, s, or p.', 256),
      userName: text('Participant display name.', 120),
      secureCode: text('Room secure code when required.', 128),
      confirm: confirmation
    }, ['meetingID', 'userName']),
    request: (input) => ({
      method: 'POST',
      path: '/v1/rooms',
      body: { action: 'join', ...pick(input, ['meetingID', 'userName', 'secureCode']) }
    })
  },
  {
    name: 'mediasfu_delete_room',
    operation: 'deleteRoom',
    sideEffect: true,
    destructive: true,
    description: 'Cancel/delete a sandbox or production room after explicit confirmation.',
    inputSchema: strictObject({ meetingID: text('Room name beginning with s or p.', 256), confirm: confirmation }, ['meetingID']),
    request: (input) => ({ method: 'POST', path: '/v1/rooms', body: { action: 'delete', meetingID: input.meetingID } })
  },
  {
    name: 'mediasfu_create_event_settings',
    operation: 'createEventSettings',
    sideEffect: true,
    description: 'Create stored event/room defaults for the account or an optional subuser after explicit confirmation.',
    inputSchema: strictObject({ ...EVENT_SETTING_PROPERTIES, confirm: confirmation }),
    request: (input) => ({
      method: 'POST',
      path: '/v1/eventssettings',
      body: { action: 'create', ...pick(input, EVENT_SETTING_FIELDS) }
    })
  },
  {
    name: 'mediasfu_update_event_settings',
    operation: 'updateEventSettings',
    sideEffect: true,
    description: 'Update stored event/room defaults for the account or an optional subuser after explicit confirmation.',
    inputSchema: strictObject({ ...EVENT_SETTING_PROPERTIES, confirm: confirmation }),
    request: (input) => ({
      method: 'POST',
      path: '/v1/eventssettings',
      body: { action: 'update', ...pick(input, EVENT_SETTING_FIELDS) }
    })
  },
  {
    name: 'mediasfu_initiate_call',
    operation: 'initiateCalls',
    sideEffect: true,
    description: 'Initiate an outbound SIP call after gathering all required call details and receiving explicit confirmation.',
    inputSchema: strictObject({
      calledDid: text('Destination number in E.164 format.', 32),
      callerIdNumber: text('Caller ID number in E.164 format.', 32),
      roomName: text('Existing room name beginning with s or p.', 256),
      initiatorName: text('Alphanumeric initiator name.', 120),
      calleeDisplayName: text('Optional SIP URI or sipcallee.', 320),
      callPurpose: text('Reason for the call.', 500),
      callObjective: text('Desired outcome.', 300),
      referenceId: text('External ticket/order/reference ID.', 100),
      urgency: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      callScript: text('Optional talking points for the agent.', 2000),
      confirm: confirmation
    }, ['calledDid', 'callerIdNumber', 'roomName', 'initiatorName']),
    request: (input) => ({
      method: 'POST',
      path: '/v1/sipcall/outgoingCall',
      body: pick(input, ['calledDid', 'callerIdNumber', 'roomName', 'initiatorName', 'calleeDisplayName', 'callPurpose', 'callObjective', 'referenceId', 'urgency', 'callScript'])
    })
  },
  {
    name: 'mediasfu_list_calls',
    operation: 'sipCallList',
    description: 'List SIP calls visible to the authenticated disposable key owner.',
    inputSchema: strictObject({
      page: { type: 'integer', minimum: 1, maximum: 100000 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      status: text('Optional call status filter.', 40),
      direction: { type: 'string', enum: ['incoming', 'outgoing'] },
      roomName: text('Optional room name.', 256),
      search: text('Optional caller/called-number search.', 200)
    }),
    request: (input) => ({ method: 'GET', path: '/v1/sipcall/list', query: input })
  },
  {
    name: 'mediasfu_get_call_summary',
    operation: 'sipCallSummary',
    description: 'Get aggregate SIP call metrics.',
    inputSchema: strictObject({}),
    request: () => ({ method: 'GET', path: '/v1/sipcall/summary' })
  },
  {
    name: 'mediasfu_get_call_state',
    operation: 'sipCallState',
    description: 'Get the current state of one SIP call.',
    inputSchema: strictObject({ sipCallId: callId }, ['sipCallId']),
    request: (input) => ({ method: 'GET', path: callPath(input.sipCallId, 'state') })
  },
  ...[
    ['mediasfu_end_call', 'sipCallEnd', 'end', {}, [], true],
    ['mediasfu_switch_call_source', 'sipCallControl', 'switch-source', { targetType: { type: 'string', enum: ['agent', 'human'] } }, ['targetType']],
    ['mediasfu_start_call_agent', 'sipCallControl', 'start-agent', {}, []],
    ['mediasfu_stop_call_agent', 'sipCallControl', 'stop-agent', {}, []],
    ['mediasfu_play_call_media', 'sipCallControl', 'play', { sourceValue: text('Approved media source value.', 2048) }, ['sourceValue']],
    ['mediasfu_hold_call', 'sipCallControl', 'hold', {}, []],
    ['mediasfu_unhold_call', 'sipCallControl', 'unhold', {}, []],
    ['mediasfu_update_call_play_to_all', 'sipCallControl', 'update-play-to-all', { playToAll: { type: 'boolean' } }, ['playToAll']],
    ['mediasfu_offer_call_callback', 'sipCallControl', 'offer-callback', {}, []],
    ['mediasfu_update_call_template', 'sipCallControl', 'update-template', { templateValues: { type: 'object', maxProperties: 50, additionalProperties: { type: ['string', 'number', 'boolean', 'null'] } } }, ['templateValues']],
    ['mediasfu_pause_call_recording', 'sipCallControl', 'pause-recording', {}, []],
    ['mediasfu_resume_call_recording', 'sipCallControl', 'resume-recording', {}, []],
    ['mediasfu_stop_call_recording', 'sipCallControl', 'stop-recording', {}, [], true]
  ].map(([name, operation, route, properties, required, destructive = false]) => ({
    name,
    operation,
    sideEffect: true,
    destructive,
    description: `Perform the ${route} action on one SIP call after explicit confirmation.`,
    inputSchema: strictObject({ sipCallId: callId, ...properties, confirm: confirmation }, ['sipCallId', ...required]),
    request: (input) => ({
      method: 'POST',
      path: callPath(input.sipCallId, route),
      body: pick(input, Object.keys(properties))
    })
  }))
];

const ACTION_BY_NAME = new Map(ACTIONS.map((action) => [action.name, action]));

function pick(source, keys) {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

function callPath(sipCallId, suffix) {
  return `/v1/sipcall/${encodeURIComponent(String(sipCallId))}/${suffix}`;
}

function validateApiBase(apiBase) {
  const url = new URL(apiBase);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('MCP_MEDIASFU_API_BASE must use HTTPS');
  }
  return url.origin;
}

function validateAuthorization(authorization) {
  const match = /^Bearer ([^:\s]{6,}):(tempsand|tempprod)[A-Za-z0-9]+$/.exec(String(authorization || ''));
  if (!match || match[2].length >= 64 || String(authorization).slice(String(authorization).indexOf(':') + 1).length !== 64) {
    throw new Error('Authorization must be Bearer <username>:<disposableKey>');
  }
  return authorization;
}

async function readBoundedText(response, maxBytes = 1024 * 1024) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error('MediaSFU response exceeded the maximum size');

  if (!response.body?.getReader) {
    const textValue = await response.text();
    if (Buffer.byteLength(textValue) > maxBytes) throw new Error('MediaSFU response exceeded the maximum size');
    return textValue;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('MediaSFU response exceeded the maximum size');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

function safePayload(value) {
  const serialized = JSON.stringify(value)
    .replace(/Bearer\s+[^"\s]+/gi, 'Bearer ***redacted***')
    .replace(/(tempsand|tempprod)[A-Za-z0-9]+/g, '$1***redacted***');
  return JSON.parse(serialized);
}

async function requestMediaSfu({
  authorization,
  apiBase,
  origin,
  fetchImpl,
  method,
  path,
  query,
  body,
  timeoutMs
}) {
  const url = new URL(path, apiBase);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: authorization,
        Origin: origin,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal
    });
    const raw = await readBoundedText(response);
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { message: 'MediaSFU returned a non-JSON response' };
    }
    return { ok: response.ok, statusCode: response.status, payload: safePayload(payload) };
  } finally {
    clearTimeout(timer);
  }
}

export async function validateActionCredential({
  authorization,
  apiBase = process.env.MCP_MEDIASFU_API_BASE || 'https://mediasfu.com',
  origin = process.env.MCP_ACTION_ORIGIN || 'https://mcp.mediasfu.com',
  fetchImpl = fetch,
  timeoutMs = Number(process.env.MCP_ACTION_TIMEOUT_MS || 15_000)
}) {
  validateAuthorization(authorization);
  const result = await requestMediaSfu({
    authorization,
    apiBase: validateApiBase(apiBase),
    origin,
    fetchImpl,
    method: 'POST',
    path: '/v1/mcp/session',
    timeoutMs
  });
  if (!result.ok || result.payload?.success !== true) {
    const error = new Error(result.payload?.error || 'Disposable credentials were rejected');
    error.statusCode = [401, 403, 429].includes(result.statusCode) ? result.statusCode : 502;
    throw error;
  }
  return result.payload;
}

export function buildActionTools(allowedToolNames = []) {
  const allowed = new Set(allowedToolNames);
  return ACTIONS
    .filter((action) => allowed.has(action.name))
    .map((action) => ({
      name: action.name,
      description: action.description,
      inputSchema: action.inputSchema,
      annotations: {
        readOnlyHint: !action.sideEffect,
        destructiveHint: Boolean(action.destructive),
        idempotentHint: false,
        openWorldHint: true
      }
    }));
}

function toolResult(payload, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(safePayload(payload), null, 2) }],
    isError
  };
}

export function createActionMcpServer({
  authorization,
  allowedToolNames,
  apiBase = process.env.MCP_MEDIASFU_API_BASE || 'https://mediasfu.com',
  origin = process.env.MCP_ACTION_ORIGIN || 'https://mcp.mediasfu.com',
  fetchImpl = fetch,
  timeoutMs = Number(process.env.MCP_ACTION_TIMEOUT_MS || 15_000)
}) {
  validateAuthorization(authorization);
  const normalizedApiBase = validateApiBase(apiBase);
  const tools = buildActionTools(allowedToolNames);
  const exposed = new Set(tools.map((tool) => tool.name));
  const server = new Server(
    { name: 'mediasfu-actions-mcp', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      instructions: 'Use these scoped MediaSFU account actions only when requested. Gather required fields first. For any side effect, show a concise preview and obtain explicit user confirmation before calling again with confirm=true.'
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const action = ACTION_BY_NAME.get(request.params.name);
    if (!action || !exposed.has(request.params.name)) {
      return toolResult({ status: 'failed', error: 'tool_not_allowed', summary: 'This disposable key does not authorize that action.' }, true);
    }

    const input = request.params.arguments || {};
    if (action.sideEffect && input.confirm !== true) {
      return toolResult({
        status: 'confirmation_required',
        tool: action.name,
        summary: 'Explicit user confirmation is required before MediaSFU will perform this action.',
        preview: safePayload(pick(input, Object.keys(input).filter((key) => key !== 'confirm'))),
        sideEffects: 'none'
      });
    }

    try {
      const requestOptions = action.request(input);
      const result = await requestMediaSfu({
        authorization,
        apiBase: normalizedApiBase,
        origin,
        fetchImpl,
        timeoutMs,
        ...requestOptions
      });
      return toolResult({
        status: result.ok ? 'success' : 'failed',
        tool: action.name,
        statusCode: result.statusCode,
        result: result.payload
      }, !result.ok);
    } catch (error) {
      return toolResult({
        status: 'failed',
        tool: action.name,
        error: error?.name === 'AbortError' ? 'request_timeout' : 'request_failed',
        summary: String(error?.message || error)
      }, true);
    }
  });

  return server;
}

export const actionCatalog = ACTIONS.map(({ name, operation, sideEffect = false, destructive = false }) => ({
  name,
  operation,
  sideEffect,
  destructive
}));
