import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  getManifestsDir,
  getToolkitRoot,
  getWorkspaceRoot,
  resolveGuideSourcePath
} from './mcp-core.mjs';

const forceStandalone = process.argv.includes('--standalone');
const executionToolkitRoot = getToolkitRoot(process.cwd());
const root = forceStandalone
  ? path.join(executionToolkitRoot, '.standalone-workspace')
  : getWorkspaceRoot(process.cwd());
const toolkitRoot = getToolkitRoot(root);
const manifestsDir = getManifestsDir(root);

const requiredFields = [
  'sdkId',
  'title',
  'packagePath',
  'apiDocsTool',
  'capabilities',
  'criticalTools',
  'supportTools',
  'toolAdapters'
];

const requiredCriticalTools = [
  'sdk.recommend',
  'app.scaffold',
  'integration.plan',
  'env.preflight',
  'room.bootstrap',
  'feature.map',
  'runtime.diagnose',
  'fix.suggest'
];

const requiredSupportTools = [
  'api.build_docs',
  'docs.sync',
  'parity.check',
  'api.reference.search',
  'room.flow.explain',
  'ui.mode.recommend',
  'ui.overrides.guide',
  'security.proxy.rooms'
];

const requiredProductionTools = [
  'frontend.architecture.plan',
  'headless.integration.plan',
  'widget.integration.plan',
  'telephony.call-control.plan',
  'runtime.readiness.diagnose',
  'lifecycle.cleanup.audit',
  'credential.broker.plan'
];

const knownAdapterKinds = new Set([
  'advisor', 'planner', 'scaffold', 'command', 'npm-script', 'guide', 'knowledge',
  'mapper', 'reference-search', 'flow-explainer', 'ui-advisor', 'ui-overrides',
  'security-guide', 'diagnostic', 'remediation', 'architecture-planner',
  'headless-planner', 'widget-planner', 'telephony-planner',
  'readiness-diagnostic', 'lifecycle-audit', 'credential-planner'
]);

const productionSourceKinds = new Set([
  'architecture-planner',
  'headless-planner',
  'widget-planner',
  'telephony-planner',
  'readiness-diagnostic',
  'lifecycle-audit',
  'credential-planner'
]);

const files = (await readdir(manifestsDir)).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.error('No manifest files found in manifests/.');
  process.exit(1);
}

let hasError = false;
let deferredLiveSourceCount = 0;
const sdkIds = new Set();

for (const file of files) {
  const fullPath = path.join(manifestsDir, file);
  const raw = await readFile(fullPath, 'utf8');
  let manifest;

  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    console.error(`Invalid JSON: ${file}`);
    hasError = true;
    continue;
  }

  if (sdkIds.has(manifest.sdkId)) {
    console.error(`Duplicate sdkId ${manifest.sdkId} in ${file}`);
    hasError = true;
  }
  sdkIds.add(manifest.sdkId);

  for (const field of requiredFields) {
    if (!(field in manifest)) {
      console.error(`Missing field ${field} in ${file}`);
      hasError = true;
    }
  }

  const packagePath = path.join(root, manifest.packagePath ?? '');
  const livePackageAvailable = existsSync(packagePath);
  const packagedGuidePath = path.join(toolkitRoot, 'references', 'sdks', `${manifest.sdkId}.md`);
  if (!livePackageAvailable && !existsSync(packagedGuidePath)) {
    console.error(`Neither packagePath nor packaged guide resolves for ${file}: ${manifest.packagePath}`);
    hasError = true;
  }

  if (!Array.isArray(manifest.criticalTools)) {
    console.error(`criticalTools must be an array in ${file}`);
    hasError = true;
  } else {
    for (const toolId of requiredCriticalTools) {
      if (!manifest.criticalTools.includes(toolId)) {
        console.error(`Missing critical tool ${toolId} in ${file}`);
        hasError = true;
      }
    }
  }

  if (!Array.isArray(manifest.supportTools)) {
    console.error(`supportTools must be an array in ${file}`);
    hasError = true;
  } else {
    for (const toolId of requiredSupportTools) {
      if (!manifest.supportTools.includes(toolId)) {
        console.error(`Missing support tool ${toolId} in ${file}`);
        hasError = true;
      }
    }
  }

    if (manifest.sdkId === 'shared') {
      for (const toolId of requiredProductionTools) {
        if (!manifest.supportTools.includes(toolId)) {
          console.error(`Missing production tool ${toolId} in ${file}`);
          hasError = true;
        }
      }
    }

  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    console.error(`capabilities must be a non-empty array in ${file}`);
    hasError = true;
  }

  if (!Array.isArray(manifest.toolAdapters) || manifest.toolAdapters.length === 0) {
    console.error(`toolAdapters must be a non-empty array in ${file}`);
    hasError = true;
  } else {
    const seenAdapterIds = new Set();
    const adapterIds = new Set(manifest.toolAdapters.map((adapter) => adapter.id));

    for (const adapter of manifest.toolAdapters) {
      if (!adapter.id || !adapter.kind) {
        console.error(`Every adapter must include id and kind in ${file}`);
        hasError = true;
        continue;
      }

      if (seenAdapterIds.has(adapter.id)) {
        console.error(`Duplicate tool adapter ${adapter.id} in ${file}`);
        hasError = true;
      }
      seenAdapterIds.add(adapter.id);

      if (adapter.kind === 'command' && !String(adapter.command ?? '').trim()) {
        console.error(`Command adapter ${adapter.id} is missing command in ${file}`);
        hasError = true;
      }

      if (!knownAdapterKinds.has(adapter.kind)) {
        console.error(`Unknown adapter kind ${adapter.kind} for ${adapter.id} in ${file}`);
        hasError = true;
      }

      if (adapter.kind === 'npm-script' && !String(adapter.script ?? '').trim()) {
        console.error(`npm-script adapter ${adapter.id} is missing script in ${file}`);
        hasError = true;
      }

      if (adapter.kind === 'diagnostic' && (!Array.isArray(adapter.patterns) || adapter.patterns.length === 0)) {
        console.error(`diagnostic adapter ${adapter.id} is missing patterns in ${file}`);
        hasError = true;
      }

      if (['guide', 'knowledge', 'reference-search'].includes(adapter.kind)) {
        const sources = Array.isArray(adapter.sources)
          ? adapter.sources
          : adapter.source
            ? [adapter.source]
            : [];

        if (sources.length === 0) {
          console.error(`${adapter.kind} adapter ${adapter.id} is missing source(s) in ${file}`);
          hasError = true;
        }

        const missingSources = [];
        let resolvedSourceCount = 0;
        for (const source of sources) {
          const resolved = resolveGuideSourcePath({ root, manifest, source });
          if (!resolved || !existsSync(resolved)) {
            missingSources.push(source);
          } else {
            resolvedSourceCount += 1;
          }
        }

        if (livePackageAvailable) {
          for (const source of missingSources) {
            console.error(`Source ${source} for ${adapter.id} does not resolve in ${file}`);
            hasError = true;
          }
        } else if (sources.length > 0 && resolvedSourceCount === 0) {
          console.error(`No packaged source for ${adapter.id} resolves in ${file}`);
          hasError = true;
        } else {
          deferredLiveSourceCount += missingSources.length;
        }
      }
      if (productionSourceKinds.has(adapter.kind)) {
        if (!adapter.source) {
          console.error(`Production adapter ${adapter.id} is missing source in ${file}`);
          hasError = true;
        } else {
          const resolved = resolveGuideSourcePath({ root, manifest, source: adapter.source });
          if (!resolved || !existsSync(resolved)) {
            console.error(`Production source ${adapter.source} for ${adapter.id} does not resolve in ${file}`);
            hasError = true;
          }
        }
      }

    }

    for (const toolId of [...requiredCriticalTools, ...requiredSupportTools]) {
      if (!adapterIds.has(toolId)) {
        console.error(`Missing tool adapter ${toolId} in ${file}`);
        hasError = true;
      }
    }
    if (manifest.sdkId === 'shared') {
      for (const toolId of requiredProductionTools) {
        if (!adapterIds.has(toolId)) {
          console.error(`Missing production adapter ${toolId} in ${file}`);
          hasError = true;
        }
      }
    }
  }
}

if (hasError) {
  console.error('Manifest validation failed.');
  process.exit(1);
}

const modeLabel = forceStandalone ? 'standalone packaged-reference mode' : 'workspace-aware mode';
const deferredLabel = deferredLiveSourceCount > 0
  ? `; deferred ${deferredLiveSourceCount} live-workspace-only source checks`
  : '';
console.log(`Validated ${files.length} manifest files in ${modeLabel}${deferredLabel}.`);
