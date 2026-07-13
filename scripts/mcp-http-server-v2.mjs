#!/usr/bin/env node
import { randomUUID, timingSafeEqual } from 'node:crypto';

import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import rateLimit from 'express-rate-limit';

import { createActionMcpServer, validateActionCredential } from './mcp-actions.mjs';
import { createMcpServer, createMcpToolSurface } from './mcp-server-factory.mjs';

const host = process.env.MCP_HOST || '127.0.0.1';
const port = Number(process.env.MCP_PORT || 3333);
const publicEndpointPath = process.env.MCP_ENDPOINT || '/mcp';
const actionEndpointPath = process.env.MCP_ACTION_ENDPOINT || '/mcp/actions';
const apiBase = process.env.MCP_MEDIASFU_API_BASE || 'https://mediasfu.com';
const actionOrigin = process.env.MCP_ACTION_ORIGIN || 'https://mcp.mediasfu.com';
const allowedHosts = String(process.env.MCP_ALLOWED_HOSTS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);
const isLocalHost = ['127.0.0.1', 'localhost', '::1'].includes(host);
const allowUnauthenticatedPublic = process.env.MCP_ALLOW_UNAUTHENTICATED_PUBLIC === '1';
const sessionTtlMs = Math.min(24 * 60 * 60 * 1000, Math.max(60_000, Number(process.env.MCP_SESSION_TTL_MS || 30 * 60 * 1000)));
const maxSessions = Math.min(10_000, Math.max(1, Number(process.env.MCP_MAX_SESSIONS || 500)));
const surface = await createMcpToolSurface();

if (publicEndpointPath === actionEndpointPath) {
  console.error('MCP_ENDPOINT and MCP_ACTION_ENDPOINT must be different paths.');
  process.exit(1);
}
if (!isLocalHost && !allowUnauthenticatedPublic) {
  console.error('Refusing public read-only MCP exposure without MCP_ALLOW_UNAUTHENTICATED_PUBLIC=1.');
  process.exit(1);
}

const safeEquals = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};

if (process.argv.includes('--self-test')) {
  console.log(JSON.stringify({
    status: 'success',
    transport: 'streamable-http',
    publicEndpointPath,
    actionEndpointPath,
    publicReadOnly: true,
    publicAuthRequired: false,
    actionAuth: 'Bearer <username>:<disposableKey>',
    sdkCount: surface.manifests.length,
    toolCount: surface.allTools.length
  }, null, 2));
  process.exit(0);
}

const app = createMcpExpressApp({
  host,
  ...(allowedHosts.length ? { allowedHosts } : {})
});
const publicTransports = new Map();
const actionTransports = new Map();

app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(rateLimit({
  windowMs: Number(process.env.MCP_RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.MCP_RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false
}));
app.use((req, res, next) => {
  req.requestId = String(req.headers['x-request-id'] || randomUUID()).slice(0, 128);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

const actionAuthorization = (req) => {
  const header = String(req.headers.authorization || '');
  return /^Bearer [^:\s]{6,}:(?:tempsand|tempprod)[A-Za-z0-9]+$/.test(header) ? header : '';
};

const sendActionUnauthorized = (res, message = 'Use Authorization: Bearer <username>:<disposableKey>') => {
  res.setHeader('WWW-Authenticate', 'Bearer');
  res.status(401).json({ error: 'unauthorized', message });
};

const createTransport = async ({ transports, createServer, authorization = '' }) => {
  let transport;
  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      transports.set(sessionId, {
        transport,
        authorization,
        lastSeenAt: Date.now()
      });
    }
  });
  transport.onclose = () => {
    if (transport.sessionId) transports.delete(transport.sessionId);
  };
  const server = await createServer();
  await server.connect(transport);
  return transport;
};

const sendMcpError = (res, requestId, status, code, message, id = null) => {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code, message: `${message} Reference request ${requestId}.` },
    id
  });
};

const makePostHandler = ({
  transports,
  createServer,
  authenticateInitialize,
  requireMatchingAuthorization = false
}) => async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  try {
    const entry = sessionId ? transports.get(sessionId) : null;
    if (entry) {
      if (requireMatchingAuthorization && !safeEquals(actionAuthorization(req), entry.authorization)) {
        sendActionUnauthorized(res);
        return;
      }
      entry.lastSeenAt = Date.now();
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      if (transports.size >= maxSessions) {
        sendMcpError(res, req.requestId, 503, -32001, 'Server session capacity reached; retry later.', req.body?.id ?? null);
        return;
      }
      const authContext = authenticateInitialize ? await authenticateInitialize(req) : {};
      const transport = await createTransport({
        transports,
        authorization: authContext.authorization || '',
        createServer: () => createServer(authContext)
      });
      await transport.handleRequest(req, res, req.body);
      return;
    }

    sendMcpError(res, req.requestId, 400, -32000, 'Missing valid MCP session or initialize request.');
  } catch (error) {
    if (res.headersSent) return;
    const status = Number(error?.statusCode || 500);
    if (status === 401) {
      sendActionUnauthorized(res, String(error?.message || 'Disposable credentials were rejected'));
      return;
    }
    const safeStatus = [403, 429, 502, 503, 504].includes(status) ? status : 500;
    console.error(JSON.stringify({
      level: 'error',
      requestId: req.requestId,
      event: 'mcp_http_request_failed',
      error: String(error?.message || error).replace(/(tempsand|tempprod)[A-Za-z0-9]+/g, '$1***redacted***')
    }));
    sendMcpError(res, req.requestId, safeStatus, -32603, 'MCP request failed.');
  }
};

const makeSessionHandler = ({
  transports,
  requireMatchingAuthorization = false,
  browserMessage
}) => async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const entry = sessionId ? transports.get(sessionId) : null;
  if (!entry) {
    if (String(req.headers.accept || '').includes('text/html')) {
      res.type('text/plain').send(browserMessage);
      return;
    }
    res.status(400).send('Invalid or missing MCP session ID');
    return;
  }
  if (requireMatchingAuthorization && !safeEquals(actionAuthorization(req), entry.authorization)) {
    sendActionUnauthorized(res);
    return;
  }
  entry.lastSeenAt = Date.now();
  await entry.transport.handleRequest(req, res);
};

const publicPost = makePostHandler({
  transports: publicTransports,
  createServer: async () => createMcpServer({ ...surface, readOnly: true })
});
const actionPost = makePostHandler({
  transports: actionTransports,
  requireMatchingAuthorization: true,
  authenticateInitialize: async (req) => {
    const authorization = actionAuthorization(req);
    if (!authorization) {
      const error = new Error('Use Authorization: Bearer <username>:<disposableKey>');
      error.statusCode = 401;
      throw error;
    }
    const session = await validateActionCredential({
      authorization,
      apiBase,
      origin: actionOrigin
    });
    return { authorization, session };
  },
  createServer: async ({ authorization, session }) => createActionMcpServer({
    authorization,
    allowedToolNames: (session.actionTools || []).map((tool) => tool.name),
    apiBase,
    origin: actionOrigin
  })
});

const publicSession = makeSessionHandler({
  transports: publicTransports,
  browserMessage: 'MediaSFU public read-only MCP endpoint is reachable. Use an MCP client to initialize a session.'
});
const actionSession = makeSessionHandler({
  transports: actionTransports,
  requireMatchingAuthorization: true,
  browserMessage: 'MediaSFU action MCP endpoint requires an MCP client and Authorization: Bearer <username>:<disposableKey>.'
});

app.get('/', (_req, res) => {
  res.type('text/plain').send([
    'MediaSFU MCP server is running.',
    `Public read-only endpoint: ${publicEndpointPath}`,
    `Authenticated actions endpoint: ${actionEndpointPath}`,
    'Health: /healthz'
  ].join('\n'));
});
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'mediasfu-mcp',
    transport: 'streamable-http',
    publicEndpointPath,
    actionEndpointPath,
    publicReadOnly: true,
    publicAuthRequired: false,
    actionAuthRequired: true,
    sdkCount: surface.manifests.length,
    publicToolCount: surface.allTools.length,
    sdks: surface.manifests.map((manifest) => manifest.sdkId)
  });
});

app.post(publicEndpointPath, publicPost);
app.get(publicEndpointPath, publicSession);
app.delete(publicEndpointPath, publicSession);
app.post(actionEndpointPath, actionPost);
app.get(actionEndpointPath, actionSession);
app.delete(actionEndpointPath, actionSession);

const cleanup = setInterval(() => {
  const cutoff = Date.now() - sessionTtlMs;
  for (const transports of [publicTransports, actionTransports]) {
    for (const [sessionId, entry] of transports.entries()) {
      if (entry.lastSeenAt >= cutoff) continue;
      transports.delete(sessionId);
      void entry.transport.close().catch(() => {});
    }
  }
}, Math.min(sessionTtlMs, 60_000));
cleanup.unref();

const httpServer = app.listen(port, host, (error) => {
  if (error) {
    console.error(`Failed to start MediaSFU MCP HTTP server: ${String(error?.message || error)}`);
    process.exit(1);
  }
  console.log(`MediaSFU MCP listening on http://${host}:${port}; public=${publicEndpointPath}; actions=${actionEndpointPath}`);
});

const shutdown = async () => {
  clearInterval(cleanup);
  for (const transports of [publicTransports, actionTransports]) {
    for (const [sessionId, entry] of transports.entries()) {
      try {
        await entry.transport.close();
      } catch {
        // Best-effort shutdown.
      }
      transports.delete(sessionId);
    }
  }
  httpServer.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
