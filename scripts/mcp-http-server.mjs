#!/usr/bin/env node
import { randomUUID, timingSafeEqual } from 'node:crypto';

import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import rateLimit from 'express-rate-limit';

import { createMcpServer, createMcpToolSurface } from './mcp-server-factory.mjs';

const host = process.env.MCP_HOST || '127.0.0.1';
const port = Number(process.env.MCP_PORT || 3333);
const endpointPath = process.env.MCP_ENDPOINT || '/mcp';
const authToken = process.env.MCP_AUTH_TOKEN || process.env.MCP_BEARER_TOKEN || '';
const readOnly = process.env.MCP_HTTP_ALLOW_SIDE_EFFECTS !== '1';
const allowedHosts = String(process.env.MCP_ALLOWED_HOSTS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);
const isLocalHost = ['127.0.0.1', 'localhost', '::1'].includes(host);
const allowUnauthenticatedPublic = process.env.MCP_ALLOW_UNAUTHENTICATED_PUBLIC === '1';
const sessionTtlMs = Math.min(24 * 60 * 60 * 1000, Math.max(60_000, Number(process.env.MCP_SESSION_TTL_MS || 30 * 60 * 1000)));
const maxSessions = Math.min(10_000, Math.max(1, Number(process.env.MCP_MAX_SESSIONS || 500)));
const safeEquals = (left, right) => {
  const a = Buffer.from(String(left)); const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};
const surface = await createMcpToolSurface();

if (!isLocalHost && !authToken && !allowUnauthenticatedPublic) {
  console.error(
    'Refusing to start public MCP HTTP server without MCP_AUTH_TOKEN. Set MCP_AUTH_TOKEN or MCP_ALLOW_UNAUTHENTICATED_PUBLIC=1 for a deliberately unauthenticated deployment.'
  );
  process.exit(1);
}

if (process.argv.includes('--self-test')) {
  console.log(
    JSON.stringify(
      {
        status: 'success',
        transport: 'streamable-http',
        endpointPath,
        readOnly,
        authRequired: Boolean(authToken),
        sdkCount: surface.manifests.length,
        toolCount: surface.allTools.length,
        sampleTools: surface.allTools.slice(0, 6).map((tool) => tool.name)
      },
      null,
      2
    )
  );
  process.exit(0);
}

const app = createMcpExpressApp({
  host,
  ...(allowedHosts.length > 0 ? { allowedHosts } : {})
});
const transports = new Map();

app.disable('x-powered-by');

// The public service is reachable only through a loopback Nginx proxy.
app.set('trust proxy', 'loopback');
app.use(
  rateLimit({
    windowMs: Number(process.env.MCP_RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.MCP_RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use((req, res, next) => {
  req.requestId = String(req.headers['x-request-id'] || randomUUID()).slice(0, 128);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

const requireBearerToken = (req, res, next) => {
  if (!authToken) {
    next();
    return;
  }

  const header = String(req.headers.authorization || '');
  const expected = `Bearer ${authToken}`;
  if (!safeEquals(header, expected)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid bearer token'
    });
    return;
  }

  next();
};

const serverInfo = () => ({
  status: 'ok',
  name: 'mediasfu-integration-mcp',
  transport: 'streamable-http',
  endpointPath,
  readOnly,
  authRequired: Boolean(authToken),
  sdkCount: surface.manifests.length,
  toolCount: surface.allTools.length,
  sdks: surface.manifests.map((manifest) => manifest.sdkId)
});

app.get('/', (_req, res) => {
  res.type('text/plain').send(
    [
      'MediaSFU MCP server is running.',
      `MCP endpoint: ${endpointPath}`,
      'This endpoint is for MCP clients, not ordinary browser navigation.',
      'Health: /healthz'
    ].join('\n')
  );
});

app.get('/healthz', (_req, res) => {
  res.json(serverInfo());
});

const createTransport = async () => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      transports.set(sessionId, { transport, lastSeenAt: Date.now() });
    }
  });

  transport.onclose = () => {
    const sessionId = transport.sessionId;
    if (sessionId) transports.delete(sessionId);
  };

  const server = createMcpServer({ ...surface, readOnly });
  await server.connect(transport);
  return transport;
};
const sessionCleanup = setInterval(() => {
  const cutoff = Date.now() - sessionTtlMs;
  for (const [sessionId, entry] of transports.entries()) {
    if (entry.lastSeenAt >= cutoff) continue;
    transports.delete(sessionId);
    void entry.transport.close().catch(() => {});
  }
}, Math.min(sessionTtlMs, 60_000));
sessionCleanup.unref();


const handleMcpPost = async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  try {
    const entry = sessionId ? transports.get(sessionId) : null;
    if (entry) {
      entry.lastSeenAt = Date.now();
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      if (transports.size >= maxSessions) {
        res.status(503).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Server session capacity reached; retry later.' },
          id: req.body?.id ?? null
        });
        return;
      }
      const transport = await createTransport();
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: missing valid MCP session or initialize request'
      },
      id: null
    });
  } catch (error) {
    if (!res.headersSent) {
    console.error(JSON.stringify({
      level: 'error', requestId: req.requestId,
      event: 'mcp_http_request_failed',
      error: String(error?.message ?? error)
    }));
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Internal error. Reference request ${req.requestId}.`
        },
        id: null
      });
    }
  }
};

const handleMcpSessionRequest = async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const entry = sessionId ? transports.get(sessionId) : null;

  if (!entry) {
    const accept = String(req.headers.accept || '');
    if (accept.includes('text/html')) {
      res.type('text/plain').send(
        [
          'MediaSFU MCP endpoint is reachable.',
          'Use an MCP client to initialize a session before calling this endpoint.',
          'Health: /healthz'
        ].join('\n')
      );
      return;
    }

    res.status(400).send('Invalid or missing MCP session ID');
    return;
  }
  entry.lastSeenAt = Date.now();
  await entry.transport.handleRequest(req, res);
};

app.post(endpointPath, requireBearerToken, handleMcpPost);
app.get(endpointPath, requireBearerToken, handleMcpSessionRequest);
app.delete(endpointPath, requireBearerToken, handleMcpSessionRequest);

const httpServer = app.listen(port, host, (error) => {
  if (error) {
    console.error(`Failed to start MediaSFU MCP HTTP server: ${String(error?.message ?? error)}`);
    process.exit(1);
  }

  console.log(
    `MediaSFU MCP Streamable HTTP server listening at http://${host}:${port}${endpointPath} readOnly=${readOnly} authRequired=${Boolean(authToken)}`
  );
});

const shutdown = async () => {
  clearInterval(sessionCleanup);
  for (const [sessionId, entry] of transports.entries()) {
    try {
      await entry.transport.close();
    } catch {
      // Best-effort shutdown.
    }
    transports.delete(sessionId);
  }

  httpServer.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
