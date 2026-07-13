import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getToolkitRoot, getWorkspaceRoot, loadAllManifests, resolveGuideSourcePath } from './mcp-core.mjs';

const forceStandalone = process.argv.includes('--standalone');
const toolkitRoot = getToolkitRoot();
const workspaceRoot = forceStandalone
  ? path.join(toolkitRoot, '.standalone-workspace')
  : getWorkspaceRoot();
const registryPath = path.join(toolkitRoot, 'sdk-registry.json');
const hash = (value) => createHash('sha256').update(value).digest('hex');

const workspaceExclusions = new Set([
  'mediasfu-mediasoup-client-android',
  'mediasfu-mediasoup-client-unity',
  'mediasfu-unity-validation'
]);

const readText = async (file) => readFile(file, 'utf8');
const evidencePatterns = {
  headless: /headless|returnUI\s*[:=].*false/i,
  runtimeHelperBundle: /sourceParameters|MediasfuParameters/i,
  aiAgents: /AI agent/i,
  sipTelephony: /\bSIP\b|PSTN|telephony/i,
  widgetIntegration: /widget studio|click.to.call/i,
  dataBuffer: /dataBuffer|bufferType/i,
  localSelfHosted: /localSocket|localLink|self-hosted/i,
  participantMedia: /getParticipantMedia/i,
  deviceEnumeration: /getMediaDevicesList|enumerateDevices/i,
  reconnect: /reconnect/i,
  lifecycleCleanup: /cleanup|dispose|unmount/i
};

const collectEvidenceTopics = (content) => Object.fromEntries(
  Object.entries(evidencePatterns).map(([topic, pattern]) => [topic, pattern.test(content)])
);


const detectPackage = async (packageRoot) => {
  const packageJson = path.join(packageRoot, 'package.json');
  if (existsSync(packageJson)) {
    const parsed = JSON.parse(await readText(packageJson));
    return { packageName: parsed.name ?? null, version: parsed.version ?? null, versionSource: 'package.json' };
  }

  const pubspec = path.join(packageRoot, 'pubspec.yaml');
  if (existsSync(pubspec)) {
    const content = await readText(pubspec);
    return {
      packageName: content.match(/^name:\s*([^\s#]+)/m)?.[1] ?? null,
      version: content.match(/^version:\s*([^\s#]+)/m)?.[1] ?? null,
      versionSource: 'pubspec.yaml'
    };
  }

  const gradle = path.join(packageRoot, 'shared', 'build.gradle.kts');
  if (existsSync(gradle)) {
    const content = await readText(gradle);
    return {
      packageName: 'mediasfu-sdk-kotlin',
      version: content.match(/pomVersion[^\n]*\?:\s*"([^"]+)"/)?.[1] ?? null,
      versionSource: 'shared/build.gradle.kts'
    };
  }

  if (existsSync(path.join(packageRoot, 'Package.swift'))) {
    return { packageName: 'mediasfu-apple-sdk', version: null, versionSource: 'Package.swift' };
  }

  return { packageName: null, version: null, versionSource: null };
};

const buildRegistry = async () => {
  const manifests = await loadAllManifests(workspaceRoot);
  const sdks = [];
const discoverWorkspaceCandidates = async () => {
  if (!existsSync(workspaceRoot)) return [];
  const entries = await readdir(workspaceRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /mediasfu/i.test(name) && !workspaceExclusions.has(name.toLowerCase()))
    .filter((name) => {
      const candidate = path.join(workspaceRoot, name);
      return existsSync(path.join(candidate, 'package.json')) ||
        existsSync(path.join(candidate, 'pubspec.yaml')) ||
        existsSync(path.join(candidate, 'shared', 'build.gradle.kts')) ||
        existsSync(path.join(candidate, 'Package.swift'));
    })
    .sort((left, right) => left.localeCompare(right));
};


  for (const manifest of manifests) {
    const manifestPath = path.join(toolkitRoot, 'manifests', `${manifest.sdkId}.json`);
    const manifestText = await readText(manifestPath);
    const packageRoot = path.resolve(workspaceRoot, manifest.packagePath);
    const packageInfo = existsSync(packageRoot) ? await detectPackage(packageRoot) : {
      packageName: null, version: null, versionSource: null
    };
    const referenceSource = `references/sdks/${manifest.sdkId}.md`;
    const referencePath = resolveGuideSourcePath({ root: workspaceRoot, manifest, source: referenceSource });
    const referenceText = referencePath && existsSync(referencePath) ? await readText(referencePath) : '';

    sdks.push({
      sdkId: manifest.sdkId,
      title: manifest.title,
      packagePath: manifest.packagePath,
      packageName: packageInfo.packageName,
      version: packageInfo.version,
      versionSource: packageInfo.versionSource,
      livePackageAvailable: existsSync(packageRoot),
      capabilities: manifest.capabilities ?? [],
      manifestSha256: hash(manifestText),
      referencePath: referenceSource,
      referenceSha256: hash(referenceText),
      evidenceTopics: collectEvidenceTopics(referenceText)
    });
  }

  const hasLiveRegisteredWorkspace = sdks.some((entry) => entry.livePackageAvailable);
  const workspaceCandidates = hasLiveRegisteredWorkspace
    ? await discoverWorkspaceCandidates()
    : [];
  const registeredWorkspaceRoots = new Set(
    sdks
      .map((entry) => safeTopLevelPath(entry.packagePath))
      .filter(Boolean)
  );
  const unregisteredCandidates = workspaceCandidates.filter((candidate) => !registeredWorkspaceRoots.has(candidate.toLowerCase()));
  return { schemaVersion: 1, sdkCount: sdks.length, workspaceCandidates, unregisteredCandidates, sdks };
};

const safeTopLevelPath = (packagePath) => {
  const normalized = String(packagePath ?? '').replace(/\\/g, '/');
  if (normalized.startsWith('../')) return null;
  return normalized.split('/')[0]?.toLowerCase() || null;
};

const stableRegistry = (registry) => JSON.stringify(registry, null, 2) + '\n';
const mode = process.argv.includes('--write') ? 'write' : 'check';
const next = await buildRegistry();

if (mode === 'write') {
  await writeFile(registryPath, stableRegistry(next), 'utf8');
  console.log(JSON.stringify({ status: 'success', action: 'written', registryPath, sdkCount: next.sdkCount }, null, 2));
  process.exit(0);
}

if (!existsSync(registryPath)) {
  console.error('sdk-registry.json is missing. Run npm run registry:write.');
  process.exit(1);
}

const current = JSON.parse(await readText(registryPath));
const currentById = new Map((current.sdks ?? []).map((entry) => [entry.sdkId, entry]));
const drift = [];
for (const entry of next.sdks) {
  const saved = currentById.get(entry.sdkId);
  if (!saved) {
    drift.push({ sdkId: entry.sdkId, field: 'registry', expected: 'entry', actual: 'missing' });
    continue;
  }
  const fields = ['packagePath', 'manifestSha256', 'referenceSha256', 'evidenceTopics'];
  if (entry.livePackageAvailable) {
    fields.push('packageName', 'version');
  }
  for (const field of fields) {
    if (JSON.stringify(saved[field] ?? null) !== JSON.stringify(entry[field] ?? null)) {
      drift.push({ sdkId: entry.sdkId, field, expected: saved[field] ?? null, actual: entry[field] ?? null });
    }
  }
}
if (next.unregisteredCandidates.length > 0) {
  console.error(JSON.stringify({ status: 'failed', summary: 'Unregistered MediaSFU SDK workspace candidates detected', candidates: next.unregisteredCandidates }, null, 2));
  process.exit(1);
}

for (const saved of current.sdks ?? []) {
  if (!next.sdks.some((entry) => entry.sdkId === saved.sdkId)) {
    drift.push({ sdkId: saved.sdkId, field: 'manifest', expected: 'present', actual: 'removed' });
  }
}

if (drift.length > 0) {
  console.error(JSON.stringify({ status: 'failed', summary: 'SDK registry drift detected', drift }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: 'success', sdkCount: next.sdkCount, summary: 'SDK registry matches manifests, references, and available live packages' }, null, 2));
