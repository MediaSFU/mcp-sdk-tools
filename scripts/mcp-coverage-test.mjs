import { getWorkspaceRoot, loadAllManifests, runManifestTool } from './mcp-core.mjs';

const root = getWorkspaceRoot();

const defaultInputs = {
  'sdk.recommend': {
    productNeeds: ['conference'],
    targetPlatforms: ['web', 'mobile', 'native']
  },
  'app.scaffold': {
    appType: 'conference',
    backendMode: 'cloud'
  },
  'integration.plan': {
    appType: 'conference',
    backendMode: 'cloud'
  },
  'env.preflight': {},
  'room.bootstrap': {
    query: 'create room'
  },
  'feature.map': {
    requestedFeatures: ['chat', 'whiteboard', 'screen-share']
  },
  'runtime.diagnose': {
    errorText: '401 socket permission transport native plugin camera microphone'
  },
  'fix.suggest': {},
  'api.build_docs': {},
  'docs.sync': {},
  'parity.check': {},
  'api.reference.search': {
    query: 'create room'
  },
  'room.flow.explain': {
    mode: 'both'
  },
  'ui.mode.recommend': {
    customizationLevel: 'medium'
  },
  'ui.overrides.guide': {
    mode: 'hybrid',
    focus: 'layout'
  },
  'frontend.architecture.plan': { mode: 'auto', ownershipLevel: 'full', needsWidget: true, needsTelephony: true },
  'headless.integration.plan': { targetSdk: 'reactjs', backendMode: 'cloud' },
  'widget.integration.plan': { widgetType: 'click-to-call' },
  'telephony.call-control.plan': { direction: 'both', needsAiAgent: true },
  'runtime.readiness.diagnose': {
    hasRoomName: true,
    hasSocket: true,
    hasLocalSocket: false,
    participantCount: 1,
    validated: true
  },
  'lifecycle.cleanup.audit': {
    codeText: "useEffect(() => { const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, []);"
  },
  'credential.broker.plan': { backendMode: 'cloud', clientType: 'browser' },
  'security.proxy.rooms': {
    backendMode: 'cloud'
  }
};

const manifests = await loadAllManifests(root);
const failures = [];
const coverage = [];
let total = 0;

for (const manifest of manifests) {
  let checked = 0;

  for (const adapter of manifest.toolAdapters ?? []) {
    total += 1;
    checked += 1;

    try {
      const result = await runManifestTool({
        manifest,
        toolId: adapter.id,
        input: defaultInputs[adapter.id] ?? {},
        root
      });

      if (result.status === 'failed') {
        failures.push({
          sdkId: manifest.sdkId,
          toolId: adapter.id,
          status: result.status,
          summary: result.summary
        });
      }
    } catch (error) {
      failures.push({
        sdkId: manifest.sdkId,
        toolId: adapter.id,
        error: String(error?.message ?? error)
      });
    }
  }

  coverage.push({
    sdkId: manifest.sdkId,
    checked,
    expected: (manifest.toolAdapters ?? []).length
  });
}

const payload = {
  status: failures.length > 0 ? 'failed' : 'success',
  sdkCount: manifests.length,
  toolCallsChecked: total,
  coverage,
  failures
};

console.log(JSON.stringify(payload, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
