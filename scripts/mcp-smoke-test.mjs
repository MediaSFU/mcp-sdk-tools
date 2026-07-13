import { getWorkspaceRoot, loadAllManifests, runManifestTool } from './mcp-core.mjs';

const root = getWorkspaceRoot();

const run = async () => {
  const manifests = await loadAllManifests(root);
  const smoke = [];

  for (const manifest of manifests) {
    const sdkId = manifest.sdkId;
    const plan = await runManifestTool({
      manifest,
      toolId: 'integration.plan',
      input: { appType: 'conference', backendMode: 'cloud' },
      root
    });

    const map = await runManifestTool({
      manifest,
      toolId: 'feature.map',
      input: { requestedFeatures: ['chat', 'whiteboard'] },
      root
    });

    const flow = await runManifestTool({
      manifest,
      toolId: 'room.flow.explain',
      input: { mode: 'both' },
      root
    });

    const ui = await runManifestTool({
      manifest,
      toolId: 'ui.mode.recommend',
      input: { customizationLevel: 'medium' },
      root
    });

    const refs = await runManifestTool({
      manifest,
      toolId: 'api.reference.search',
      input: { query: 'create room' },
      root
    });

    const uiOverrides = await runManifestTool({
      manifest,
      toolId: 'ui.overrides.guide',
      input: { mode: 'hybrid', focus: 'layout' },
      root
    });

    const security = await runManifestTool({
      manifest,
      toolId: 'security.proxy.rooms',
      input: { backendMode: 'cloud' },
      root
    });

    smoke.push({
      sdkId,
      integrationPlanStatus: plan.status,
      featureMapStatus: map.status,
      roomFlowStatus: flow.status,
      uiModeStatus: ui.status,
      uiOverridesStatus: uiOverrides.status,
      proxySecurityStatus: security.status,
      referenceSearchStatus: refs.status,
      referenceMatches: Array.isArray(refs.references?.matches) ? refs.references.matches.length : 0,
      capabilitiesCount: Array.isArray(map.capabilities) ? map.capabilities.length : 0
    });
  }

  console.log(JSON.stringify({ status: 'success', checked: smoke.length, smoke }, null, 2));
};

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        error: String(error?.message ?? error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
