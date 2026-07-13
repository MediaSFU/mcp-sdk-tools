import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { getWorkspaceRoot, loadAllManifests, runManifestTool } from './mcp-core.mjs';

const root = getWorkspaceRoot();
const manifests = await loadAllManifests(root);
const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'mediasfu-mcp-scaffolds-'));
const forbidden = [
  /your-64-character-api-key/i,
  /your-api-key/i,
  /your-api-username/i,
  /localStorage.*credential/i
];
const results = [];

try {
  for (const manifest of manifests) {
    const outputDir = path.posix.join('generated', manifest.sdkId);
    const result = await runManifestTool({
      manifest,
      toolId: 'app.scaffold',
      input: { apply: true, projectRoot, outputDir },
      root
    });

    assert.equal(result.status, 'success', manifest.sdkId);
    assert.equal(result.scaffold.mode, 'apply', manifest.sdkId);
    assert.ok(result.changedPaths.includes(`${outputDir}/MEDIASFU_INTEGRATION.md`), manifest.sdkId);
    assert.equal(result.changedPaths.length, 4, manifest.sdkId);

    const contents = [];
    for (const relativePath of result.changedPaths) {
      const absolutePath = path.join(projectRoot, relativePath);
      assert.ok((await stat(absolutePath)).isFile(), relativePath);
      contents.push(await readFile(absolutePath, 'utf8'));
    }
    const combined = contents.join('\n');
    for (const pattern of forbidden) assert.doesNotMatch(combined, pattern, `${manifest.sdkId}: ${pattern}`);
    assert.match(combined, /scoped room\/session|scoped session|scoped room/i, manifest.sdkId);

    const generated = result.changedPaths.filter((entry) => !entry.endsWith('MEDIASFU_INTEGRATION.md'));
    if (manifest.sdkId === 'reactjs') {
      assert.ok(generated.every((entry) => entry.endsWith('.tsx')));
      assert.match(combined, /MediasfuGeneric/);
      assert.match(combined, /sourceParameters/);
      assert.match(combined, /returnUI=\{false\}/);
      assert.match(combined, /\/api\/mediasfu\/session/);
    } else {
      assert.ok(generated.every((entry) => entry.endsWith('.md')), manifest.sdkId);
      assert.match(combined, /version-aware implementation recipe/i, manifest.sdkId);
    }

    await assert.rejects(
      () => runManifestTool({
        manifest,
        toolId: 'app.scaffold',
        input: { apply: true, projectRoot, outputDir },
        root
      }),
      /Refusing to overwrite existing scaffold files/
    );

    results.push({ sdkId: manifest.sdkId, files: result.changedPaths.length });
  }
} finally {
  await rm(projectRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'success',
  sdkCount: results.length,
  generatedFileCount: results.reduce((sum, entry) => sum + entry.files, 0),
  checks: [
    'all-sdk-generation',
    'credential-placeholder-hygiene',
    'react-production-patterns',
    'version-aware-recipes',
    'collision-refusal',
    'temporary-cleanup'
  ]
}, null, 2));
