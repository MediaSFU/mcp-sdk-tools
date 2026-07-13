import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { getWorkspaceRoot, loadAllManifests, runManifestTool } from './mcp-core.mjs';

const splitName = (fullName) => {
  const [sdkId, ...toolParts] = String(fullName).split('::');
  return { sdkId, toolId: toolParts.join('::') };
};

const findManifest = (manifests, sdkId) => manifests.find((manifest) => manifest.sdkId === sdkId);

const buildToolDescription = (manifest, adapter) => {
  const aliases = Array.isArray(manifest.aliases) && manifest.aliases.length > 0
    ? ` aliases: ${manifest.aliases.join(', ')}`
    : '';
  return `${manifest.title} :: ${adapter.id} (${adapter.kind}).${aliases}`;
};

const text = (description, maxLength = 500) => ({ type: 'string', maxLength, description });
const requestedFeatures = {
  type: 'array', maxItems: 32, uniqueItems: true, items: text('Required feature.', 80)
};
const projectRoot = text('Absolute path to the consumer project. Defaults to the MCP process working directory.', 1024);
const INTERNAL_TOOL_IDS = new Set(['api.build_docs', 'docs.sync', 'parity.check']);
const isInternalAdapter = (adapter) => adapter.scope === 'internal' || INTERNAL_TOOL_IDS.has(adapter.id);


const buildInputSchema = (adapter) => {
  const propertiesByKind = {
    command: { execute: { type: 'boolean', description: 'Execute the trusted manifest command; omitted means dry-run.' }, projectRoot },
    'npm-script': { execute: { type: 'boolean', description: 'Execute the trusted manifest script; omitted means dry-run.' }, projectRoot },
    scaffold: {
      apply: { type: 'boolean', description: 'Write generated files; omitted means dry-run.' },
      projectRoot,
      overwrite: { type: 'boolean', description: 'Replace existing generated files. Defaults to false.' },
      outputDir: text('Relative directory below projectRoot. Defaults to mediasfu-generated/<sdk>.', 240)
    },
    advisor: { appType: text('Application type.', 80), requestedFeatures },
    planner: {
      appType: text('Application type.', 80),
      backendMode: { type: 'string', enum: ['cloud', 'self-hosted', 'local'] },
      requestedFeatures
    },
    mapper: { requestedFeatures },
    'reference-search': { query: text('Search terms for bundled SDK references.', 500) },
    diagnostic: { errorText: text('Sanitized error or log excerpt.', 8000) },
    'flow-explainer': { mode: { type: 'string', enum: ['create', 'join', 'both'] } },
    'ui-advisor': {
      customizationLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
      ownershipLevel: { type: 'string', enum: ['managed', 'partial', 'full'] }
    },
    'ui-overrides': {
      mode: text('SDK-supported UI ownership mode.', 80),
      focus: { type: 'string', enum: ['branding', 'layout', 'cards', 'controls', 'headless-shell', 'native-bridge'] }
    },
    'security-guide': { backendMode: { type: 'string', enum: ['cloud', 'self-hosted', 'local'] } },
    guide: { query: text('Optional topic to locate in the guide.', 500) },
    knowledge: { query: text('Optional topic to locate in the guide.', 500) },
    'architecture-planner': {
      mode: { type: 'string', enum: ['auto', 'prebuilt', 'hybrid', 'headless'] },
      ownershipLevel: { type: 'string', enum: ['managed', 'partial', 'full'] },
      needsWidget: { type: 'boolean' }, needsTelephony: { type: 'boolean' }
    },
    'headless-planner': {
      targetSdk: { type: 'string', enum: ['reactjs', 'angular', 'vue', 'react-native', 'react-native-expo', 'flutter', 'kotlin', 'swift', 'unity', 'shared'] },
      appType: text('Application type.', 80),
      backendMode: { type: 'string', enum: ['cloud', 'self-hosted', 'local'] }
    },
    'widget-planner': { widgetType: text('Widget type, for example click-to-call or meeting.', 80) },
    'telephony-planner': { direction: { type: 'string', enum: ['incoming', 'outgoing', 'both'] }, needsAiAgent: { type: 'boolean' } },
    'readiness-diagnostic': {
      hasRoomName: { type: 'boolean' }, hasSocket: { type: 'boolean' }, hasLocalSocket: { type: 'boolean' },
      participantCount: { type: 'integer', minimum: 0, maximum: 100000 },
      validated: { type: 'boolean' }, failureMessage: text('Sanitized SDK failure text.', 2000)
    },
    'lifecycle-audit': { codeText: text('Sanitized integration code excerpt. Do not include credentials.', 16000) },
    'credential-planner': { backendMode: { type: 'string', enum: ['cloud', 'self-hosted', 'local'] }, clientType: text('browser, mobile, desktop, Unity, or server.', 80) }
  };
  const requiredByKind = {
    'reference-search': ['query'],
    diagnostic: ['errorText']
  };

  return {
    type: 'object',
    additionalProperties: false,
    properties: propertiesByKind[adapter.kind] ?? {},
    ...(requiredByKind[adapter.kind] ? { required: requiredByKind[adapter.kind] } : {})
  };
};

export const buildMcpTools = (manifests, { includeInternal = false } = {}) =>
  manifests.flatMap((manifest) =>
    (manifest.toolAdapters ?? [])
      .filter((adapter) => includeInternal || !isInternalAdapter(adapter))
      .map((adapter) => ({
        name: `${manifest.sdkId}::${adapter.id}`,
        description: buildToolDescription(manifest, adapter),
        inputSchema: buildInputSchema(adapter)
      }))
  );

export const createMcpToolSurface = async ({ root = getWorkspaceRoot(), includeInternal = process.env.MCP_INCLUDE_INTERNAL_TOOLS === '1' } = {}) => {
  const manifests = await loadAllManifests(root);
  const allTools = buildMcpTools(manifests, { includeInternal });
  return { root, manifests, allTools, includeInternal };
};

const hasSideEffectRequest = (input) => input?.execute === true || input?.apply === true;

export const createMcpServer = ({
  root, manifests, allTools, readOnly = false,
  allowSideEffects = process.env.MCP_ALLOW_LOCAL_SIDE_EFFECTS === '1'
} = {}) => {
  const server = new Server(
    {
      name: 'mediasfu-integration-mcp',
      version: '0.3.0'
    },
    {
      capabilities: {
        tools: {}
      },
      instructions:
        'Use these MediaSFU SDK tools to select an SDK, plan an integration, search SDK references, scaffold starter files, and diagnose room/media runtime issues. Dry-run is the default for tools with side effects.'
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const exposedToolNames = new Set(allTools.map((tool) => tool.name));
    const { sdkId, toolId } = splitName(request.params.name);
    const manifest = findManifest(manifests, sdkId);

    if (!manifest || !toolId || !exposedToolNames.has(request.params.name)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'failed',
                summary: `Unknown tool name: ${request.params.name}`
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }

    const input = request.params.arguments ?? {};

    if (hasSideEffectRequest(input) && (readOnly || !allowSideEffects)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'failed',
                toolId,
                sdkId,
                summary: readOnly ? 'This MCP server is running in read-only hosted mode.' : 'Side effects are disabled. Set MCP_ALLOW_LOCAL_SIDE_EFFECTS=1 only for a trusted local server.',
                executedActions: [],
                changedPaths: [],
                nextActions: [
                  'Run the tool without execute/apply for a dry-run plan',
                  'Use a trusted local stdio MCP server for intentional side-effect operations'
                ],
                riskNotes: [
                  'Hosted MCP endpoints should not run arbitrary package commands or write generated files unless explicitly isolated'
                ],
                confidence: 'high',
                sideEffects: 'none'
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }

    const result = await runManifestTool({ manifest, toolId, input, root });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ],
      isError: result.status === 'failed'
    };
  });

  return server;
};

export const createMcpServerFromRoot = async (root = getWorkspaceRoot()) => {
  const surface = await createMcpToolSurface({ root });
  return {
    ...surface,
    server: createMcpServer(surface)
  };
};
