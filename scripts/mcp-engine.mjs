import {
  getWorkspaceRoot,
  loadManifest,
  runManifestTool
} from './mcp-core.mjs';

const root = getWorkspaceRoot();

const args = process.argv.slice(2);
const command = args[0];
const sdkId = args[1];
const toolId = args[2];

const getArgValue = (name) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
};

const parseInput = () => {
  const raw = getArgValue('--input');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid --input JSON: ${String(error?.message ?? error)}`);
  }
};

const output = (payload) => {
  console.log(JSON.stringify(payload, null, 2));
};

const usage = () => {
  output({
    status: 'failed',
    message: 'Usage: node ./scripts/mcp-engine.mjs <list|run> <sdkId> [toolId] [--input JSON]'
  });
  process.exit(1);
};

if (!command || !sdkId) {
  usage();
}

const manifest = await loadManifest(sdkId, root).catch((error) => {
  output({ status: 'failed', message: `Unable to load manifest for sdkId=${sdkId}`, error: String(error.message ?? error) });
  process.exit(1);
});

if (command === 'list') {
  output({
    status: 'success',
    sdkId,
    title: manifest.title,
    criticalTools: manifest.criticalTools,
    supportTools: manifest.supportTools,
    capabilities: manifest.capabilities
  });
  process.exit(0);
}

if (command !== 'run' || !toolId) {
  usage();
}

const adapter = (manifest.toolAdapters ?? []).find((entry) => entry.id === toolId);
if (!adapter) {
  output({ status: 'failed', message: `Tool adapter ${toolId} not found for ${sdkId}` });
  process.exit(1);
}

let input;
try {
  input = parseInput();
} catch (error) {
  output({ status: 'failed', message: String(error?.message ?? error) });
  process.exit(1);
}
const result = await runManifestTool({ manifest, toolId, input, root });
output(result);
