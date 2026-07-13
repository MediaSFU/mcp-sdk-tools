import assert from 'node:assert/strict';

import { getWorkspaceRoot, loadAllManifests, loadManifest, runManifestTool } from './mcp-core.mjs';
import { buildMcpTools } from './mcp-server-factory.mjs';

const root = getWorkspaceRoot();
const manifests = await loadAllManifests(root);
const publicTools = buildMcpTools(manifests);
const internalTools = buildMcpTools(manifests, { includeInternal: true });

assert.equal(manifests.length, 10);
assert.equal(publicTools.some((tool) => tool.name.endsWith('::docs.sync')), false);
assert.equal(publicTools.some((tool) => tool.name.endsWith('::parity.check')), false);
assert.equal(publicTools.some((tool) => tool.name.endsWith('::api.build_docs')), false);
assert.equal(internalTools.length - publicTools.length, 30);

const shared = await loadManifest('shared', root);
const run = (toolId, input) => runManifestTool({ manifest: shared, toolId, input, root });

const architecture = await run('frontend.architecture.plan', {
  mode: 'auto', ownershipLevel: 'full', needsWidget: true, needsTelephony: true
});
assert.equal(architecture.architecturePlan.recommendedMode, 'headless');
assert.ok(architecture.architecturePlan.requiredCompanions.includes('widget.integration.plan'));
assert.ok(architecture.architecturePlan.requiredCompanions.includes('telephony.call-control.plan'));

const headless = await run('headless.integration.plan', { targetSdk: 'reactjs', backendMode: 'cloud' });
assert.equal(headless.headlessPlan.runtime.state, 'sourceParameters');
assert.match(headless.headlessPlan.runtime.headless, /returnUI/);
assert.ok(headless.headlessPlan.warnings.some((warning) => warning.includes('REST create response')));

const widget = await run('widget.integration.plan', { widgetType: 'click-to-call' });
assert.ok(widget.widgetPlan.requestHeaders.includes('X-Widget-Key'));
assert.ok(widget.widgetPlan.prohibited.some((rule) => rule.includes('account API key')));

const telephony = await run('telephony.call-control.plan', { direction: 'both', needsAiAgent: true });
assert.ok(telephony.telephonyPlan.roomOptions.includes('supportSIP'));
assert.ok(telephony.telephonyPlan.backendOperations.includes('human takeover'));

const notReady = await run('runtime.readiness.diagnose', {
  hasRoomName: true, hasSocket: false, hasLocalSocket: false, participantCount: 0, validated: true
});
assert.equal(notReady.status, 'needs-action');
assert.equal(notReady.readiness.ready, false);

const ready = await run('runtime.readiness.diagnose', {
  hasRoomName: true, hasSocket: false, hasLocalSocket: true, participantCount: 0, validated: true
});
assert.equal(ready.status, 'success');
assert.equal(ready.readiness.ready, true);

const lifecycle = await run('lifecycle.cleanup.audit', {
  codeText: `useEffect(() => { const controller = new AbortController(); const timer = setInterval(tick, 1000); window.addEventListener('pagehide', cleanup); return () => { clearInterval(timer); window.removeEventListener('pagehide', cleanup); stream.getTracks().forEach((track) => track.stop()); controller.abort(); }; }, []); const initializedRef = useRef(false);`
});
assert.equal(lifecycle.lifecycle.missing.length, 0);

const credentials = await run('credential.broker.plan', { backendMode: 'cloud', clientType: 'browser' });
assert.ok(credentials.credentialBrokerPlan.never.some((rule) => rule.includes('long-lived API key')));

const react = await loadManifest('reactjs', root);
const dryRun = await runManifestTool({

  manifest: react,
  toolId: 'app.scaffold',
  input: { projectRoot: process.cwd(), outputDir: 'tmp/mediasfu-plan' },
  root
});
const featureMap = await runManifestTool({
  manifest: react,
  toolId: 'feature.map',
  input: { requestedFeatures: ['conference', 'screen-share'] },
  root
});
assert.equal(featureMap.sdkRelease.packageName, 'mediasfu-reactjs');
assert.ok(featureMap.sdkRelease.version);
assert.equal(Object.keys(featureMap.capabilityEvidence).length, 11);
for (const evidence of Object.values(featureMap.capabilityEvidence)) {
  assert.ok(['documented', 'not-evidenced'].includes(evidence.status));
  assert.equal(evidence.source, 'references/sdks/reactjs.md');
}
assert.equal(featureMap.featureCoverage.coveragePercent, 100);

assert.equal(dryRun.scaffold.projectRoot, process.cwd());
assert.equal(dryRun.scaffold.outputRoot, 'tmp/mediasfu-plan');
await assert.rejects(
  () => runManifestTool({
    manifest: react,
    toolId: 'app.scaffold',
    input: { projectRoot: process.cwd(), outputDir: '../escape' },
    root
  }),
  /contained by projectRoot/
);

console.log(JSON.stringify({
  status: 'success',
  publicToolCount: publicTools.length,
  internalToolCount: internalTools.length,
  checks: [
    'public-internal-separation',
    'architecture-plan',
    'headless-plan',
    'widget-security',
    'telephony-ai-control',
    'runtime-readiness',
    'lifecycle-cleanup',
    'credential-broker',
    'versioned-capability-evidence',
    'safe-consumer-scaffold-root'
  ]
}, null, 2));
