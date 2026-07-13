import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toolkitRootFromModule = path.resolve(__dirname, '..');

export const getToolkitRoot = (cwd = process.cwd()) => {
  const resolved = path.resolve(cwd);

  if (path.basename(resolved) === 'mcp-sdk-tools') {
    return resolved;
  }

  const nestedToolkit = path.join(resolved, 'mcp-sdk-tools');
  if (existsSync(path.join(nestedToolkit, 'manifests'))) {
    return nestedToolkit;
  }

  return toolkitRootFromModule;
};

export const getWorkspaceRoot = (cwd = process.cwd()) => path.resolve(getToolkitRoot(cwd), '..');

export const getManifestsDir = (root) => path.join(getToolkitRoot(root), 'manifests');

export const loadManifest = async (sdkId, root = getWorkspaceRoot()) => {
  const filePath = path.join(getManifestsDir(root), `${sdkId}.json`);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

export const loadAllManifests = async (root = getWorkspaceRoot()) => {
  const dir = getManifestsDir(root);
  const files = (await readdir(dir)).filter((entry) => entry.endsWith('.json'));
  const manifests = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), 'utf8');
      return JSON.parse(raw);
    })
  );
  return manifests.sort((a, b) => String(a.sdkId).localeCompare(String(b.sdkId)));
};


let sdkRegistryCache;
const loadSdkRegistry = async (root) => {
  if (sdkRegistryCache) return sdkRegistryCache;
  try {
    const registryPath = path.join(getToolkitRoot(root), 'sdk-registry.json');
    sdkRegistryCache = JSON.parse(await readFile(registryPath, 'utf8'));
  } catch {
    sdkRegistryCache = { sdks: [] };
  }
  return sdkRegistryCache;
};

const evidenceStatus = (value) => value === true ? 'documented' : 'not-evidenced';
const buildCapabilityEvidence = (entry) => Object.fromEntries(
  Object.entries(entry?.evidenceTopics ?? {}).map(([topic, evidenced]) => [topic, {
    status: evidenceStatus(evidenced),
    source: entry?.referencePath ?? null
  }])
);
const safePath = (value) => String(value ?? '').replace(/\\/g, '/');

const resolvePackagedSourcePath = ({ root, manifest, normalized }) => {
  const toolkitRoot = getToolkitRoot(root);

  if (normalized.startsWith('references/')) {
    return path.join(toolkitRoot, normalized);
  }

  const sdkGuideMatch = normalized.match(/^website\/docs\/sdks\/([^/]+\.md)$/);
  if (sdkGuideMatch) {
    return path.join(toolkitRoot, 'references', 'sdks', sdkGuideMatch[1]);
  }

  if (normalized === 'README.md') {
    return path.join(toolkitRoot, 'references', 'sdks', `${manifest.sdkId}.md`);
  }

  return null;
};

export const resolveGuideSourcePath = ({ root, manifest, source }) => {
  const sourceText = String(source ?? '').trim();
  if (!sourceText) return null;

  const normalized = safePath(sourceText);
  let candidate;

  // Treat explicit root-relative project docs paths as workspace rooted.
  if (normalized.startsWith('docs/') || normalized.startsWith('website/')) {
    candidate = path.join(root, normalized);
  } else if (normalized.startsWith('references/')) {
    candidate = path.join(getToolkitRoot(root), normalized);
  } else {
    // Otherwise resolve against package path first.
    candidate = path.join(root, manifest.packagePath, sourceText);
  }

  if (existsSync(candidate)) {
    return candidate;
  }

  const fallback = resolvePackagedSourcePath({ root, manifest, normalized });
  if (fallback && existsSync(fallback)) {
    return fallback;
  }

  return candidate;
};

const extractGuidanceExcerpt = ({ content, query }) => {
  const lines = content.split(/\r?\n/);
  const loweredQuery = String(query ?? '').trim().toLowerCase();

  if (!loweredQuery) {
    return {
      queryMatched: false,
      excerpt: lines.slice(0, 120).join('\n')
    };
  }

  const hitIndex = lines.findIndex((line) => line.toLowerCase().includes(loweredQuery));
  if (hitIndex === -1) {
    return {
      queryMatched: false,
      excerpt: lines.slice(0, 120).join('\n')
    };
  }

  const start = Math.max(0, hitIndex - 30);
  const end = Math.min(lines.length, hitIndex + 31);
  return {
    queryMatched: true,
    excerpt: lines.slice(start, end).join('\n')
  };
};

const loadGuidance = async ({ root, manifest, source, query }) => {
  const resolvedPath = resolveGuideSourcePath({ root, manifest, source });
  if (!resolvedPath) {
    return {
      referencePath: null,
      queryMatched: false,
      excerpt: 'No guidance source configured.'
    };
  }

  try {
    const content = await readFile(resolvedPath, 'utf8');
    const extracted = extractGuidanceExcerpt({ content, query });
    return {
      referencePath: path.relative(root, resolvedPath).replace(/\\/g, '/'),
      queryMatched: extracted.queryMatched,
      excerpt: extracted.excerpt
    };
  } catch (error) {
    return {
      referencePath: path.relative(root, resolvedPath).replace(/\\/g, '/'),
      queryMatched: false,
      excerpt: `Unable to read guidance source: ${String(error?.message ?? error)}`
    };
  }
};

const buildReferenceMatches = ({ content, query, referencePath, maxResults = 6 }) => {
  const lines = content.split(/\r?\n/);
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  const stopWords = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  const queryTerms = normalizedQuery.split(/[^a-z0-9_.-]+/).filter((term) => term.length > 1 && !stopWords.has(term));
  const results = [];

  const scoreLine = (line) => {
    const lowered = String(line).toLowerCase();
    if (queryTerms.length === 0) return 0;

    const matchedTerms = queryTerms.filter((term) => lowered.includes(term));
    const exactPhrase = normalizedQuery.length > 0 && lowered.includes(normalizedQuery);
    const minimumMatches = queryTerms.length <= 1 ? 1 : Math.ceil(queryTerms.length * 0.6);
    if (!exactPhrase && matchedTerms.length < minimumMatches) return null;
    let score = 0;
    for (const term of matchedTerms) {
      score += 2;
      }

    if (score === 0) return null;

    if (exactPhrase) {
      score += 6;
    }

    if (/createRoomOnMediaSFU|joinRoomOnMediaSFU|useLocalUIMode|uiOverrides|returnUI|headless/i.test(line)) {
      score += 3;
    }

    if (/^\s{0,3}#{1,6}\s+/.test(line) || /^\s*<h[1-6]/i.test(line)) {
      score += 1;
    }

    return {
      score,
      matchedTerms,
      termCoverage: queryTerms.length === 0 ? 0 : Math.round((matchedTerms.length / queryTerms.length) * 100)
    };
  };

  for (let index = 0; index < lines.length; index += 1) {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    const scored = scoreLine(lines.slice(start, end).join('\n'));
    if (!scored) continue;

    results.push({
      path: referencePath,
      line: index + 1,
      score: scored.score,
      matchedTerms: scored.matchedTerms,
      termCoverage: scored.termCoverage,
      excerpt: lines.slice(start, end).join('\n')
    });
  }

  results.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.line - right.line;
  });

  return results.slice(0, maxResults);
};

const runReferenceSearch = async ({ root, manifest, adapter, query }) => {
  const sources = Array.isArray(adapter.sources)
    ? adapter.sources
    : adapter.source
      ? [adapter.source]
      : [];

  const allResults = [];

  let sourcesChecked = 0;
  for (const source of sources) {
    const resolvedPath = resolveGuideSourcePath({ root, manifest, source });
    if (!resolvedPath) continue;

    try {
      const content = await readFile(resolvedPath, 'utf8');
      const referencePath = path.relative(root, resolvedPath).replace(/\\/g, '/');
      const hits = buildReferenceMatches({
        content,
        query,
        referencePath,
        maxResults: Number(adapter.maxResults ?? 6)
      });
      sourcesChecked += 1;
      allResults.push(...hits);
    } catch {
      // Skip unreadable or absent sources and continue searching others.
    }
  }

  return {
    query: String(query ?? ''),
    sourcesChecked,
    ranking: 'score-desc',
    matches: allResults.slice(0, Number(adapter.maxResults ?? 6))
  };
};

const uniqueSteps = (steps) => {
  const seen = new Set();
  const out = [];
  for (const step of steps) {
    const key = String(step).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
};

const sdkFlowAdditions = {
  reactjs: {
    create: [
      'Select prebuilt, hybrid, or headless UI ownership before mounting room surface',
      'Apply uiOverrides only after first successful create flow is stable'
    ],
    join: [
      'Confirm browser media permissions and HTTPS requirements before join retries'
    ]
  },
  angular: {
    create: [
      'Wire module imports and dependency injection bindings before room initialization',
      'Verify component inputs for returnUI and useLocalUIMode based on chosen UI mode'
    ],
    join: [
      'Check zone and change detection behavior if participant state appears stale'
    ]
  },
  vue: {
    create: [
      'Register plugin/composable dependencies before first room mount',
      'Verify reactive state bindings for participants and media controls'
    ],
    join: [
      'Validate Composition API lifecycle hooks around socket reconnect handling'
    ]
  },
  'react-native': {
    create: [
      'Grant camera, microphone, and storage permissions before first room action',
      'Confirm Metro and native bridge are healthy before media transport setup'
    ],
    join: [
      'Re-check Android and iOS permission status when join fails after app backgrounding'
    ]
  },
  'react-native-expo': {
    create: [
      'Validate Expo config and dev client capabilities for required media features',
      'Confirm Expo permission prompts are accepted before transport initialization'
    ],
    join: [
      'Check Expo runtime constraints if join works on simulator but fails on device'
    ]
  },
  flutter: {
    create: [
      'Run flutter pub get and verify platform setup before room bootstrap',
      'Validate credential wiring in options model before first create request'
    ],
    join: [
      'Confirm platform-specific permissions and web CORS configuration for join flows'
    ]
  },
  kotlin: {
    create: [
      'Run Gradle sync and ensure Compose dependencies resolve before room startup',
      'Verify dependency coordinates and SDK versions match target environment'
    ],
    join: [
      'Check runtime permission grants and websocket reachability on target device'
    ]
  },
  shared: {
    create: [
      'Validate socket manager initialization and backend credentials before create call',
      'Confirm framework wrapper state model can consume returned room payloads'
    ],
    join: [
      'Ensure join payload fields map correctly into wrapper-level room state'
    ]
  },
  unity: {
    create: [
      'Install the Unity mediasoup client package before the MediaSFU Unity SDK package',
      'Attach the native WebRTC bridge before enabling microphone, camera, or remote playback'
    ],
    join: [
      'Validate target-platform native plugin binaries before shipping a Unity player build'
    ]
  },
  swift: {
    create: [
      'Add camera and microphone usage strings before presenting the hosted room controller',
      'Install the native mediasoup/WebRTC bridge before enabling real device media'
    ],
    join: [
      'Validate on physical Apple devices when camera, microphone, or screen share are involved'
    ]
  }
};

const buildRoomFlow = ({ adapter, input, sdkId }) => {
  const mode = String(input.mode ?? 'both').toLowerCase();
  const flow = adapter.flow ?? {};
  const add = sdkFlowAdditions[String(sdkId ?? '').toLowerCase()] ?? { create: [], join: [] };
  const createFlow = uniqueSteps([...(Array.isArray(flow.create) ? flow.create : []), ...(add.create ?? [])]);
  const joinFlow = uniqueSteps([...(Array.isArray(flow.join) ? flow.join : []), ...(add.join ?? [])]);

  if (mode === 'create') {
    return { mode, steps: createFlow };
  }
  if (mode === 'join') {
    return { mode, steps: joinFlow };
  }

  return {
    mode: 'both',
    create: createFlow,
    join: joinFlow
  };
};

const recommendUiMode = ({ input, manifest }) => {
  const sdkId = String(manifest?.sdkId ?? '').toLowerCase();
  const customizationLevel = String(input.customizationLevel ?? 'medium').toLowerCase();
  const ownershipLevel = String(input.ownershipLevel ?? '').toLowerCase();

  if (sdkId === 'unity') {
    if (ownershipLevel === 'full' || customizationLevel === 'high') {
      return {
        recommendedMode: 'headless-orchestration',
        rationale: 'Full Unity scene ownership fits app-owned controls with MediaSFU room orchestration underneath.',
        tradeoffs: ['Best fit for games and simulations', 'Requires explicit scene, media, and control bindings'],
        modeDetails: {
          keySettings: {
            sceneOwnsUI: true,
            attachNativeWebRtcDevice: true
          },
          bestFor: 'Custom Unity scenes that render participants and controls in product-owned UI.'
        }
      };
    }

    return {
      recommendedMode: 'unity-scene-owned',
      rationale: 'Unity integrations naturally keep the presentation layer inside the scene while MediaSFU handles room orchestration.',
      tradeoffs: ['Clear Unity ownership model', 'Requires platform media validation'],
      modeDetails: {
        keySettings: {
          installMediaClientFirst: true,
          useBasicRoomFlowSample: true
        },
        bestFor: 'Unity apps that need fast room connection with custom scene rendering.'
      }
    };
  }

  if (sdkId === 'swift') {
    if (ownershipLevel === 'full' || customizationLevel === 'high') {
      return {
        recommendedMode: 'native-bridge-owned-controls',
        rationale: 'Full native Apple ownership fits a custom SwiftUI/UIKit shell backed by MediaSFU bridge calls.',
        tradeoffs: ['Native product control', 'More lifecycle and permission handling'],
        modeDetails: {
          keySettings: {
            installNativeMediasoupBridge: true,
            triggerMediaControlsFromSwift: true
          },
          bestFor: 'Native Apple apps that own setup, controls, and presentation.'
        }
      };
    }

    return {
      recommendedMode: 'hosted-controller',
      rationale: 'The hosted controller is the lowest-friction Swift path to first create/join success.',
      tradeoffs: ['Fastest native Apple setup', 'Less UI ownership than a fully custom shell'],
      modeDetails: {
        keySettings: {
          MediaSFUIosHostBridge: true,
          autoProceed: 'optional'
        },
        bestFor: 'UIKit or SwiftUI apps that want a quick native room surface.'
      }
    };
  }

  const byMode = {
    prebuilt: {
      keySettings: {
        returnUI: true,
        useLocalUIMode: false
      },
      bestFor: 'Fastest time-to-value with minimal customization.'
    },
    hybrid: {
      keySettings: {
        returnUI: true,
        uiOverrides: true,
        customMainComponent: 'optional'
      },
      bestFor: 'Progressive customization with retained MediaSFU room shell.'
    },
    headless: {
      keySettings: {
        returnUI: false,
        updateSourceParameters: true,
        noUIPreJoinOptions: 'required-for-no-ui-flow'
      },
      bestFor: 'Full product-owned UI with MediaSFU runtime orchestration.'
    }
  };

  if (ownershipLevel === 'full' || customizationLevel === 'high') {
    return {
      recommendedMode: 'headless',
      rationale: 'High customization or full ownership requirements fit headless integration best.',
      tradeoffs: ['Maximum flexibility', 'Highest implementation effort'],
      modeDetails: byMode.headless
    };
  }

  if (customizationLevel === 'low') {
    return {
      recommendedMode: 'prebuilt',
      rationale: 'Low customization needs fit prebuilt UI for fastest delivery.',
      tradeoffs: ['Fastest time to first room', 'Limited deep customization'],
      modeDetails: byMode.prebuilt
    };
  }

  return {
    recommendedMode: 'hybrid',
    rationale: 'Medium customization benefits from prebuilt room foundations with targeted overrides.',
    tradeoffs: ['Balanced speed and customization', 'Some UI constraints remain'],
    modeDetails: byMode.hybrid
  };
};

const buildUiOverridesGuide = ({ manifest, input, adapter }) => {
  const mode = String(input.mode ?? 'hybrid').toLowerCase();
  const focus = String(input.focus ?? 'branding').toLowerCase();

  const common = {
    keyProps: [
      'returnUI',
      'uiOverrides',
      'customMainComponent',
      'useLocalUIMode',
      'updateSourceParameters',
      'noUIPreJoinOptions'
    ],
    baselineOrder: [
      'Get first successful create/join flow with default UI',
      'Apply shallow style and branding overrides',
      'Override targeted cards/controls',
      'Move to hybrid or headless only after runtime stability'
    ],
    focusAreas: Array.isArray(adapter.focusAreas) ? adapter.focusAreas : []
  };

  const byMode = {
    prebuilt: {
      strategy: 'Use default room UI and only apply style-level overrides first.',
      firstChanges: ['Container and brand assets', 'Button and typography styling', 'Theme-level spacing and color tokens']
    },
    hybrid: {
      strategy: 'Keep room shell but replace targeted UI slots/components.',
      firstChanges: ['Video/participant cards', 'Top and side control bars', 'Modal and panel wrappers']
    },
    headless: {
      strategy: 'Use MediaSFU runtime orchestration with your own app-owned UI shell.',
      firstChanges: ['Set returnUI false', 'Pass prejoin options programmatically', 'Bind source parameters into your own components']
    },
    'unity-scene-owned': {
      strategy: 'Keep the room surface inside Unity scene objects and route room/media state through C# components.',
      firstChanges: ['Install both Unity packages', 'Start from BasicRoomFlow sample', 'Bind remote media to scene surfaces']
    },
    'hybrid-controls': {
      strategy: 'Use MediaSFU Unity room orchestration while replacing controls with product-specific Unity UI.',
      firstChanges: ['Bind mute/camera controls', 'Add participant status labels', 'Validate target platform native plugin']
    },
    'headless-orchestration': {
      strategy: 'Use MediaSFU Unity as the room/media orchestration layer and own the full scene UI.',
      firstChanges: ['Create product-owned room controller', 'Attach native WebRTC bridge', 'Map room state into gameplay or simulation objects']
    },
    'hosted-controller': {
      strategy: 'Present the MediaSFU hosted controller from Swift for fastest native Apple integration.',
      firstChanges: ['Add Swift package', 'Add camera/microphone plist strings', 'Present full-screen controller']
    },
    'auto-proceed-prejoin': {
      strategy: 'Let the app own setup screens, then launch MediaSFU with autoProceed enabled.',
      firstChanges: ['Collect room fields in native UI', 'Set action create or join', 'Present controller after validation']
    },
    'native-bridge-owned-controls': {
      strategy: 'Use Swift/UIKit/SwiftUI controls while routing media actions through the installed native bridge.',
      firstChanges: ['Install mediasoup bridge', 'Trigger media controls after room readiness', 'Validate on target devices']
    }
  };

  const byFocus = {
    branding: ['logos', 'color palette', 'typography hierarchy'],
    layout: ['grid behavior', 'sidebar placement', 'breakpoint strategy'],
    cards: ['participant metadata', 'status badges', 'custom action slots'],
    controls: ['mute/camera affordances', 'menu grouping', 'host controls'],
    'headless-shell': ['routing', 'state ownership', 'runtime adapter boundaries']
  };

  return {
    sdk: manifest.sdkId,
    mode,
    focus,
    common,
    modeGuide: byMode[mode] ?? byMode.hybrid,
    focusChecklist: byFocus[focus] ?? byFocus.branding
  };
};

const buildProxySecurityGuide = ({ manifest, input, adapter }) => {
  const backendMode = String(input.backendMode ?? 'cloud').toLowerCase();

  return {
    sdk: manifest.sdkId,
    backendMode,
    nonNegotiables: [
      'Never ship long-lived MediaSFU API keys in client bundles',
      'Create/join room requests should go through your backend proxy',
      'Issue short-lived scoped tokens from server side only',
      'Validate and sanitize room payloads on backend before forwarding'
    ],
    proxyEndpoints: {
      create: '/api/mediasfu/rooms/create',
      join: '/api/mediasfu/rooms/join'
    },
    backendControls: [
      'Rate-limit create and join endpoints by IP and user ID',
      'Add request origin checks and auth/session validation',
      'Log room lifecycle events with trace IDs for audits',
      'Mask credentials/tokens in logs and errors'
    ],
    clientRules: [
      'Client calls your backend only, never direct cloud room endpoints with secrets',
      'Use environment variables for non-secret public config only',
      'Retry logic should not expose raw backend error internals'
    ],
    patterns: Array.isArray(adapter.patterns) ? adapter.patterns : []
  };
};

const sdkRuntimeModels = {
  reactjs: { state: 'sourceParameters', update: 'updateSourceParameters', headless: 'returnUI={false}', prejoin: 'noUIPreJoinOptions' },
  angular: { state: 'sourceParameters', update: 'updateSourceParameters', headless: 'returnUI=false', prejoin: 'noUIPreJoinOptions' },
  vue: { state: 'sourceParameters', update: 'updateSourceParameters', headless: ':returnUI="false"', prejoin: 'noUIPreJoinOptions' },
  'react-native': { state: 'sourceParameters', update: 'updateSourceParameters', headless: 'returnUI={false}', prejoin: 'noUIPreJoinOptions' },
  'react-native-expo': { state: 'sourceParameters', update: 'updateSourceParameters', headless: 'returnUI={false}', prejoin: 'noUIPreJoinOptions' },
  flutter: { state: 'MediasfuParameters', update: 'updateSourceParameters', headless: 'returnUI: false', prejoin: 'noUIPreJoinOptionsCreate/noUIPreJoinOptionsJoin' },
  kotlin: { state: 'room state/controller', update: 'observable state callbacks', headless: 'app-owned Compose UI', prejoin: 'create/join options' },
  swift: { state: 'MediaSFUIosHostBridge state', update: 'bridge callbacks', headless: 'native bridge-owned controls', prejoin: 'launch config' },
  unity: { state: 'MediaSfuClient room state', update: 'C# callbacks/events', headless: 'scene-owned UI', prejoin: 'create/join request' },
  shared: { state: 'framework-owned room store', update: 'event/router adapter', headless: 'framework-owned UI', prejoin: 'create/join payload' }
};

const buildFrontendArchitecturePlan = ({ input }) => {
  const needsWidget = input.needsWidget === true;
  const needsTelephony = input.needsTelephony === true;
  const ownership = String(input.ownershipLevel ?? 'partial').toLowerCase();
  const requestedMode = String(input.mode ?? 'auto').toLowerCase();
  const mode = requestedMode !== 'auto'
    ? requestedMode
    : ownership === 'full' || needsWidget || needsTelephony ? 'headless' : ownership === 'managed' ? 'prebuilt' : 'hybrid';
  return {
    recommendedMode: mode,
    layers: [
      { name: 'product-backend', owns: ['long-lived credentials', 'authorization', 'tenant/room policy', 'widget and call-control APIs'] },
      { name: 'session-broker', owns: ['scoped disposable key or server-created room', 'correlation ID', 'expiry and operation scope'] },
      { name: 'mediasfu-runtime', owns: ['signaling', 'media transports', 'room helper bundle', 'participant/media state'] },
      { name: 'product-ui', owns: mode === 'prebuilt' ? ['navigation and product shell'] : ['derived UI state', 'controls', 'error and reconnect UX'] }
    ],
    requiredCompanions: [
      ...(needsWidget ? ['widget.integration.plan'] : []),
      ...(needsTelephony ? ['telephony.call-control.plan'] : []),
      ...(mode === 'headless' ? ['runtime.readiness.diagnose', 'lifecycle.cleanup.audit'] : []),
      'credential.broker.plan'
    ]
  };
};

const buildHeadlessPlan = ({ input }) => {
  const sdkId = String(input.targetSdk ?? 'reactjs').toLowerCase();
  const runtime = sdkRuntimeModels[sdkId] ?? sdkRuntimeModels.shared;
  return {
    targetSdk: sdkId,
    runtime,
    implementationOrder: [
      'Obtain scoped session/room material from the product backend',
      `Mount the SDK using ${runtime.headless} and ${runtime.prejoin}`,
      `Capture the complete runtime through ${runtime.update} into a stable ${runtime.state} container`,
      'Derive a small serializable UI state instead of rendering from the mutable helper bundle',
      'Declare connection ready only after real room identity and transport/session evidence exist',
      'Bind media controls using the latest complete runtime parameters',
      'Add idempotent cleanup, reconnect, and one-shot workflow guards'
    ],
    readiness: ['real roomName', 'socket or localSocket when exposed', 'no terminal failure', 'validated/session or participant/media evidence'],
    warnings: ['Do not start agents/data buffers from the REST create response alone', 'Do not store long-lived API credentials in browser or app storage']
  };
};

const buildWidgetPlan = () => ({
  flow: [
    'Embed contains a public widget key only',
    'Client sends widget key and current origin to the product backend',
    'Backend validates origin, widget status, rate limit, tenant, and configured disposable key',
    'Backend creates the room/call and returns minimum safe connection data',
    'Client mounts the SDK and reports explicit end-call',
    'Backend independently expires and cleans abandoned calls'
  ],
  requestHeaders: ['X-Widget-Key', 'X-Widget-Origin'],
  serverControls: ['exact origin allowlist', 'operation-scoped disposable key', 'per-IP and per-widget limits', 'idempotency key', 'audit correlation ID'],
  prohibited: ['account API key in embed code', 'trusting Origin header without widget configuration', 'client-only cleanup']
});

const buildTelephonyPlan = () => ({
  roomOptions: ['supportSIP', 'directionSIP', 'preferPCMA when required', 'dataBuffer/bufferType', 'recording policy'],
  runtimeState: ['roomName', 'socket/localSocket', 'participants', 'media helpers'],
  backendCallState: ['callId', 'direction', 'hold/recording state', 'activeMediaSource', 'agent and transfer state', 'prompt/music state'],
  backendOperations: ['hold/resume', 'start/stop agent', 'human takeover', 'transfer', 'play-to-all', 'hangup'],
  localSdkOperations: ['microphone/camera', 'device selection', 'participant media rendering'],
  synchronization: ['Prefer events; otherwise bounded polling', 'Stop polling on terminal state/unmount/call replacement', 'Confirm mutations from subsequent backend/runtime state']
});

const diagnoseReadiness = (input) => {
  const hasRoomName = input.hasRoomName === true;
  const hasTransport = input.hasSocket === true || input.hasLocalSocket === true;
  const participantCount = Math.max(0, Number(input.participantCount ?? 0));
  const failure = String(input.failureMessage ?? '').trim();
  const checks = [
    { check: 'real-room-name', pass: hasRoomName, action: 'Wait for the SDK/server-assigned room name; do not rely on a provisional name.' },
    { check: 'transport-or-session-evidence', pass: hasTransport || participantCount > 0, action: 'Wait for socket/localSocket or SDK-specific validated session evidence.' },
    { check: 'no-terminal-failure', pass: !failure, action: 'Classify the failure and retry only transient network/5xx cases.' },
    { check: 'validation-not-false', pass: input.validated !== false, action: 'Refresh scoped credentials/session and repeat create/join.' }
  ];
  return {
    ready: checks.every((entry) => entry.pass),
    checks,
    caution: participantCount > 0 && !hasTransport ? 'Participants alone are not durable transport readiness evidence.' : null
  };
};

const auditLifecycle = (input) => {
  const code = String(input.codeText ?? '');
  const checks = [
    ['interval-cleanup', /clearInterval|clearTimeout/.test(code)],
    ['listener-cleanup', /removeEventListener|\.off\(|removeListener/.test(code)],
    ['abortable-fetch', /AbortController|signal\s*:/.test(code)],
    ['media-track-cleanup', /getTracks\(\).*stop|track\.stop/.test(code)],
    ['component-cleanup', /return\s*\(\)\s*=>|dispose|cleanup/i.test(code)],
    ['idempotency-guard', /useRef|initialized|inFlight|idempot/i.test(code)]
  ].map(([check, pass]) => ({ check, pass }));
  return {
    checks,
    missing: checks.filter((entry) => !entry.pass).map((entry) => entry.check),
    note: code ? 'Static heuristic only; verify SDK-specific teardown and backend hangup behavior.' : 'Provide a sanitized codeText excerpt for a heuristic audit.'
  };
};

const buildCredentialBrokerPlan = () => ({
  exchange: ['Authenticate user to product backend', 'Validate tenant/room/origin/operation', 'Create room server-side or issue scoped disposable key', 'Return minimum session data plus expiry and correlation ID'],
  disposableKeyPolicy: ['short expiry', 'minimum operations', 'explicit production domains', 'per-key rate limit', 'revocation and usage monitoring'],
  redact: ['Authorization', 'apiKey', 'disposableKey', 'room secret', 'cookie', 'token'],
  never: ['long-lived API key in client bundle/storage', 'credentials in MCP prompts', 'raw upstream stack traces in client errors']
});

const buildBaseResponse = ({ manifest, adapter, input, summary, sideEffects = 'none', confidence = 'medium' }) => ({
  status: 'success',
  toolId: adapter.id,
  sdkId: manifest.sdkId,
  summary,
  executedActions: [
    `Loaded manifest for ${manifest.sdkId}`,
    `Resolved adapter ${adapter.id}`
  ],
  changedPaths: [],
  nextActions: [
    'Review generated guidance',
    'Use apply/execute modes only after validating impact'
  ],
  riskNotes: [
    'Dry-run is the default behavior',
    'Do not put secrets directly in tool input payloads'
  ],
  confidence,
  sideEffects,
  input
});

const boundedNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const runCommand = async ({ command, cwd }) => new Promise((resolve) => {
    const timeoutMs = boundedNumber(process.env.MCP_COMMAND_TIMEOUT_MS, 120_000, 1_000, 600_000);
    const maxOutputBytes = boundedNumber(process.env.MCP_COMMAND_OUTPUT_MAX_BYTES, 256 * 1024, 16 * 1024, 2 * 1024 * 1024);
    const startedAt = Date.now();
    let settled = false;
    let timedOut = false;
    let truncated = false;
    let stdout = '';
    let stderr = '';

    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code: timedOut ? 124 : (code ?? 1),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        truncated,
        durationMs: Date.now() - startedAt
      });
    };

    const append = (current, chunk) => {
      const combined = current + String(chunk);
      if (Buffer.byteLength(combined, 'utf8') <= maxOutputBytes) return combined;
      truncated = true;
      return combined.slice(0, maxOutputBytes) + '\n...[output truncated]';
    };

    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
      windowsHide: true
    });

    child.stdout.on('data', (chunk) => {
      if (!truncated) stdout = append(stdout, chunk);
    });

    child.stderr.on('data', (chunk) => {
      if (!truncated) stderr = append(stderr, chunk);
    });

    child.on('error', (error) => {
      stderr = append(stderr, String(error?.message ?? error));
      finish(1);
    });
    child.on('close', finish);

    const timer = setTimeout(() => {
    const terminate = () => {
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          shell: false, windowsHide: true, stdio: 'ignore'
        });
        killer.unref();
      } else {
        child.kill('SIGTERM');
      }
    };
      timedOut = true;
      stderr = append(stderr, `Command exceeded ${timeoutMs}ms timeout.`);
      terminate();
      setTimeout(() => finish(124), 2_000).unref();
    }, timeoutMs);
    timer.unref();
  });

const scaffoldExtensionFor = ({ manifest, template }) => {
  if (/package-install|dependency/i.test(template)) return '.md';
  if (manifest.sdkId === 'reactjs') return '.tsx';
  return '.md';
};

const scaffoldFileName = ({ manifest, template }) => {
  const segments = safePath(template)
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  const extension = scaffoldExtensionFor({ manifest, template });
  const fileName = `${segments.pop() ?? 'starter'}${extension}`;
  return path.join(...segments, fileName);
};

const reactScaffoldContent = (template) => {
  if (template === 'react-provider') return `// Generated by MediaSFU MCP scaffold
import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { Credentials, CreateMediaSFURoomOptions, JoinMediaSFURoomOptions } from 'mediasfu-reactjs';

export type MediaSFUScopedSession = {
  credentials: Credentials;
  roomOptions: CreateMediaSFURoomOptions | JoinMediaSFURoomOptions;
};

const MediaSFUSessionContext = createContext<MediaSFUScopedSession | null>(null);

export function MediaSFUSessionProvider({ session, children }: PropsWithChildren<{ session: MediaSFUScopedSession }>) {
  return <MediaSFUSessionContext.Provider value={session}>{children}</MediaSFUSessionContext.Provider>;
}

export function useMediaSFUSession() {
  const session = useContext(MediaSFUSessionContext);
  if (!session) throw new Error('MediaSFUSessionProvider is missing.');
  return session;
}

export async function fetchScopedMediaSFUSession(endpoint = '/api/mediasfu/session'): Promise<MediaSFUScopedSession> {
  const response = await fetch(endpoint, { method: 'POST', credentials: 'include' });
  if (!response.ok) throw new Error(\`MediaSFU session request failed (\${response.status}).\`);
  return response.json();
}
`;

  if (template === 'hooks/useMediaSFU') return `// Generated by MediaSFU MCP scaffold
import { useCallback, useMemo, useRef, useState } from 'react';

export function useMediaSFURuntime() {
  const latest = useRef<Record<string, any>>({});
  const [sourceParameters, setSourceParameters] = useState<Record<string, any>>({});
  const updateSourceParameters = useCallback((next: Record<string, any>) => {
    latest.current = next;
    setSourceParameters(next);
  }, []);
  const readiness = useMemo(() => {
    const parameters = latest.current;
    const socket = parameters.localSocket?.id ? parameters.localSocket : parameters.socket;
    return { ready: Boolean(parameters.roomName && socket?.id), roomName: parameters.roomName ?? null, member: parameters.member ?? null, socket: socket ?? null };
  }, [sourceParameters]);
  return { sourceParameters, latest, updateSourceParameters, readiness };
}
`;

  return `// Generated by MediaSFU MCP scaffold
import React from 'react';
import { MediasfuGeneric, PreJoinPage } from 'mediasfu-reactjs';
import 'mediasfu-reactjs/dist/main.css';
import { useMediaSFUSession } from './react-provider';
import { useMediaSFURuntime } from './hooks/useMediaSFU';

export function MediaSFUHeadlessRoom() {
  const { credentials, roomOptions } = useMediaSFUSession();
  const runtime = useMediaSFURuntime();
  return (
    <div style={{ width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
      <MediasfuGeneric
        PrejoinPage={(options: any) => <PreJoinPage {...options} />}
        credentials={credentials}
        connectMediaSFU={true}
        returnUI={false}
        noUIPreJoinOptions={roomOptions}
        sourceParameters={runtime.sourceParameters}
        updateSourceParameters={runtime.updateSourceParameters}
      />
    </div>
  );
}
`;
};

const scaffoldTemplateContent = ({ manifest, template, sdkRelease }) => {
  const sdkId = manifest.sdkId;
  const safeName = template.replace(/[^a-zA-Z0-9-_]/g, '_');
  if (sdkId === 'reactjs') return reactScaffoldContent(template);

  const runtime = sdkRuntimeModels[sdkId] ?? sdkRuntimeModels.shared;
  const release = sdkRelease?.version
    ? `\`${sdkRelease.packageName ?? manifest.title}\` version \`${sdkRelease.version}\``
    : `the packaged ${manifest.title} reference (no local release version detected)`;
  return `# MediaSFU ${manifest.title}: ${safeName}

This is a version-aware implementation recipe for ${release}. It is intentionally not speculative source code: copy exact API names from the packaged SDK reference before compiling.

## Implement this boundary

1. Add or configure the \`${template}\` integration boundary.
2. Fetch scoped room/session material from your authenticated backend at runtime.
3. Mount the SDK using its documented create/join options.
4. Capture complete runtime state via \`${runtime.update}\` and retain the latest value.
5. Treat \`${runtime.state}\` as ready only when room name and active socket/session evidence exist.
6. Bind custom controls only after readiness, using \`${runtime.headless}\` when supported.
7. On exit, remove listeners, cancel timers and retries, stop owned tracks, and invoke SDK cleanup.

## Acceptance checks

- Create and join succeed on the exact target platform.
- Denied camera/microphone permission produces a recoverable state.
- Reconnect does not duplicate listeners or media producers.
- Leaving and re-entering does not preserve stale runtime state.
- No long-lived API credential is stored in source, app storage, logs, or the shipped binary.

Run \`${sdkId}::api.reference.search\` for \`${template}\` and \`${sdkId}::feature.map\` before translating this recipe into source.
`;
};

const scaffoldChecklistContent = ({ manifest, sdkRelease }) => {
  const runtime = sdkRuntimeModels[manifest.sdkId] ?? sdkRuntimeModels.shared;
  return `# MediaSFU ${manifest.title} integration checklist

This scaffold is a starting boundary, not a place for long-lived credentials.

- SDK package: \`${sdkRelease?.packageName ?? 'not detected'}\`
- Detected version: \`${sdkRelease?.version ?? 'not detected'}\`
- Output: ${manifest.sdkId === 'reactjs' ? 'production-pattern React starter; compile in the consumer app' : 'version-aware recipes; translate against the packaged SDK reference'}

## Runtime model

- Headless setting: \`${runtime.headless}\`
- Runtime state: \`${runtime.state}\`
- Runtime update: \`${runtime.update}\`
- Programmatic prejoin: \`${runtime.prejoin}\`

## Required order

1. Add the SDK dependency and finish platform permission setup.
2. Obtain scoped session/room material from your authenticated backend.
3. Mount the SDK and capture its complete runtime/helper state.
4. Wait for a real room name plus transport/session evidence before dependent work.
5. Derive a small UI state and bind controls using the latest runtime parameters.
6. Add idempotent cleanup for timers, listeners, tracks, retries, and backend hangup.

## Security

Never put a long-lived MediaSFU API key in a browser, mobile, desktop, Swift, Kotlin, Flutter, or Unity build. Use a backend-created room or an operation/domain/expiry-scoped disposable key.

Run \`shared::credential.broker.plan\`, \`shared::runtime.readiness.diagnose\`, and \`shared::lifecycle.cleanup.audit\` before production.
`;
};

const resolveConsumerProject = (input = {}) => path.resolve(
  String(input.projectRoot || process.env.MCP_PROJECT_ROOT || process.cwd())
);

const resolveScaffoldDestination = ({ manifest, input = {} }) => {
  const projectRoot = resolveConsumerProject(input);
  const relativeOutput = safePath(input.outputDir || `mediasfu-generated/${manifest.sdkId}`);
  if (path.isAbsolute(relativeOutput) || relativeOutput.split('/').includes('..')) {
    throw new Error('outputDir must be a relative path contained by projectRoot.');
  }
  const outDir = path.resolve(projectRoot, relativeOutput);
  const relative = path.relative(projectRoot, outDir);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Scaffold destination escapes projectRoot.');
  }
  return { projectRoot, outDir, relativeOutput };
};

const scaffoldFiles = async ({ manifest, templates, input, root }) => {
  const { projectRoot, outDir, relativeOutput } = resolveScaffoldDestination({ manifest, input });
  const registry = await loadSdkRegistry(root);
  const sdkRelease = (registry.sdks ?? []).find((entry) => entry.sdkId === manifest.sdkId) ?? null;
  if (!existsSync(projectRoot)) throw new Error(`projectRoot does not exist: ${projectRoot}`);
  const checklistPath = path.join(outDir, 'MEDIASFU_INTEGRATION.md');
  const plannedFiles = [
    checklistPath,
    ...templates.map((template) => path.join(outDir, scaffoldFileName({ manifest, template })))
  ];
  const collisions = plannedFiles.filter((filePath) => existsSync(filePath));
  if (collisions.length > 0 && input.overwrite !== true) {
    throw new Error(`Refusing to overwrite existing scaffold files: ${collisions.map((filePath) => path.relative(projectRoot, filePath)).join(', ')}`);
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(checklistPath, scaffoldChecklistContent({ manifest, sdkRelease }), 'utf8');
  const changedPaths = [path.relative(projectRoot, checklistPath).replace(/\\/g, '/')];


  for (const template of templates) {
    const fileName = scaffoldFileName({ manifest, template });
    const filePath = path.join(outDir, fileName);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, scaffoldTemplateContent({ manifest, template, sdkRelease }), 'utf8');
    changedPaths.push(path.relative(projectRoot, filePath).replace(/\\/g, '/'));
  }

  return {
    outDir: relativeOutput,
    projectRoot,
    changedPaths
  };
};

const redactInput = (input) => {
  const visit = (value, key = '') => {
    if (/key|token|secret|password|authorization|credential|cookie/i.test(key)) {
      return '***redacted***';
    }
    if (Array.isArray(value)) return value.map((entry) => visit(entry));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, visit(child, childKey)]));
    }
    if (typeof value === 'string') {
      return value
        .replace(/Bearer\s+[^\s"']+/gi, 'Bearer ***redacted***')
        .replace(/([\w.-]+:)[A-Za-z0-9_-]{32,}/g, '$1***redacted***');
    }
    return value;
  }
  return visit(input);
};

export const runManifestTool = async ({ manifest, toolId, input = {}, root = getWorkspaceRoot() }) => {
  const adapter = (manifest.toolAdapters ?? []).find((entry) => entry.id === toolId);
  if (!adapter) {
    return {
      status: 'failed',
      toolId,
      sdkId: manifest.sdkId,
      summary: `Tool adapter ${toolId} not found for ${manifest.sdkId}`,
      executedActions: [],
      changedPaths: [],
      nextActions: ['Check tool ID and manifest configuration'],
      riskNotes: [],
      confidence: 'low',
      sideEffects: 'none',
      input: redactInput(input)
    };
  }

  const safeInput = redactInput(input);

  switch (adapter.kind) {
    case 'advisor':
      return buildBaseResponse({
        manifest,
        adapter,
        input: safeInput,
        summary: `${manifest.title} recommended profile: ${adapter.profile}`,
        confidence: 'high'
      });

    case 'planner':
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Generated integration plan for ${manifest.title}`,
          confidence: 'high'
        }),
        plan: {
          checkpoints: adapter.checkpoints ?? [],
          backendMode: input.backendMode ?? 'cloud',
          appType: input.appType ?? 'conference'
        }
      };

    case 'scaffold': {
      const templates = adapter.templates ?? [];
      const destination = resolveScaffoldDestination({ manifest, input });
      const apply = input.apply === true;
      const base = buildBaseResponse({
        manifest,
        adapter,
        input: safeInput,
        summary: apply
          ? `Scaffold templates applied for ${manifest.title}`
          : `Scaffold template plan prepared for ${manifest.title}`,
        sideEffects: apply ? 'applied' : 'planned',
        confidence: 'high'
      });

      if (!apply) {
        return {
          ...base,
          scaffold: {
            templates,
            mode: 'dry-run',
            outputRoot: destination.relativeOutput,
            projectRoot: destination.projectRoot
          }
        };
      }

      const scaffold = await scaffoldFiles({ manifest, templates, input, root });
      return {
        ...base,
        changedPaths: scaffold.changedPaths,
        scaffold: {
          templates,
          mode: 'apply',
          outputRoot: scaffold.outDir
        }
      };
    }

    case 'command': {
      const execute = input.execute === true;
      const command = String(adapter.command ?? '').trim();
      const internalCommand = ['docs.sync', 'parity.check', 'api.build_docs'].includes(adapter.id);
      const cwd = internalCommand ? root : resolveConsumerProject(input);
      const base = buildBaseResponse({
        manifest,
        adapter,
        input: safeInput,
        summary: execute ? `Executed command for ${adapter.id}` : `Prepared command for ${adapter.id}`,
        sideEffects: execute ? 'applied' : 'none'
      });

      if (!execute) {
        return {
          ...base,
          command,
          mode: 'dry-run',
          cwd,
        };
      }

      const result = await runCommand({ command, cwd });
      return {
        ...base,
        command,
        mode: 'execute',
        commandResult: result,
        status: result.code === 0 ? 'success' : 'failed',
        confidence: result.code === 0 ? 'medium' : 'low'
      };
    }

    case 'npm-script': {
      const execute = input.execute === true;
      const command = `npm run ${adapter.script}`;
      const internalCommand = ['docs.sync', 'parity.check', 'api.build_docs'].includes(adapter.id);
      const cwd = internalCommand ? path.join(root, manifest.packagePath) : resolveConsumerProject(input);
      const base = buildBaseResponse({
        manifest,
        adapter,
        input: safeInput,
        summary: execute ? `Executed npm script for ${adapter.id}` : `Prepared npm script for ${adapter.id}`,
        sideEffects: execute ? 'applied' : 'none'
      });

      if (!execute) {
        return {
          ...base,
          command,
          cwd: manifest.packagePath,
          mode: 'dry-run'
        };
      }

      const result = await runCommand({ command, cwd });
      return {
        ...base,
        command,
        cwd: manifest.packagePath,
        mode: 'execute',
        commandResult: result,
        status: result.code === 0 ? 'success' : 'failed',
        confidence: result.code === 0 ? 'medium' : 'low'
      };
    }

    case 'guide':
    case 'knowledge': {
      const guidance = await loadGuidance({
        root,
        manifest,
        source: adapter.source,
        query: input.query
      });
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Guidance source resolved for ${adapter.id}`
        }),
        source: adapter.source,
        guidance
      };
    }

    case 'mapper': {
      const normalizeFeature = (value) => String(value ?? '')
        .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : [];
      const supportedSet = new Set(capabilities.map(normalizeFeature));
      const requested = Array.isArray(input.requestedFeatures) ? input.requestedFeatures : [];
      const registry = await loadSdkRegistry(root);
      const registryEntry = (registry.sdks ?? []).find((entry) => entry.sdkId === manifest.sdkId);
      const supported = requested.filter((feature) => supportedSet.has(normalizeFeature(feature)));
      const unsupported = requested.filter((feature) => !supportedSet.has(normalizeFeature(feature)));
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: requested.length === 0
            ? `Feature map resolved for ${manifest.title}`
            : `${supported.length}/${requested.length} requested features matched ${manifest.title}`,
          confidence: unsupported.length === 0 ? 'high' : 'medium'
        }),
        capabilities,
        capabilityEvidence: buildCapabilityEvidence(registryEntry),
        sdkRelease: registryEntry ? {
          packageName: registryEntry.packageName,
          version: registryEntry.version,
          versionSource: registryEntry.versionSource,
          referenceSha256: registryEntry.referenceSha256
        } : null,
        featureCoverage: {
          requested,
          supported,
          unsupported,
          coveragePercent: requested.length === 0 ? null : Math.round((supported.length / requested.length) * 100),
          note: unsupported.length > 0
            ? 'Unsupported means not declared in this packaged manifest; verify current SDK docs before ruling it out.'
            : 'All requested features are declared by this packaged manifest.'
        }
      };
    }

    case 'reference-search': {
      const references = await runReferenceSearch({
        root,
        manifest,
        adapter,
        query: input.query
      });
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Reference search completed for ${manifest.title}`,
          confidence: references.matches.length > 0 ? 'high' : 'medium'
        }),
        references,
        nextActions:
          references.matches.length > 0
            ? ['Review top reference excerpts', 'Run room.flow.explain to map create/join lifecycle']
            : ['Try a broader query (for example: create room, join room, local ui mode)']
      };
    }

    case 'flow-explainer': {
      const roomFlow = buildRoomFlow({ adapter, input, sdkId: manifest.sdkId });
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Room lifecycle flow generated for ${manifest.title}`,
          confidence: 'high'
        }),
        nextActions: ['Run api.reference.search with query "create room"', 'Use ui.mode.recommend to align UI ownership model'],
        roomFlow
      };
    }

    case 'ui-advisor': {
      const recommendation = recommendUiMode({ input, manifest });
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `UI mode recommendation generated for ${manifest.title}`,
          confidence: 'high'
        }),
        uiRecommendation: {
          ...recommendation,
          modes: Array.isArray(adapter.modes) ? adapter.modes : ['prebuilt', 'hybrid', 'headless']
        }
      };
    }

    case 'ui-overrides': {
      const guide = buildUiOverridesGuide({ manifest, input, adapter });
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `UI override guide generated for ${manifest.title}`,
          confidence: 'high'
        }),
        uiOverridesGuide: guide,
        nextActions: [
          'Run ui.mode.recommend for mode confirmation',
          'Run api.reference.search with query "uiOverrides" for SDK-specific references'
        ]
      };
    }

    case 'security-guide': {
      const security = buildProxySecurityGuide({ manifest, input, adapter });
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Proxy credential security guide generated for ${manifest.title}`,
          confidence: 'high'
        }),
        proxySecurityGuide: security,
        nextActions: [
          'Implement backend proxy endpoints before exposing room actions in UI',
          'Run runtime.diagnose if create/join fails after proxy rollout'
        ]
      };
    }

    case 'diagnostic': {
      const errorText = String(input.errorText ?? '').toLowerCase();
      const matches = (adapter.patterns ?? []).filter((pattern) =>
        errorText.includes(String(pattern).toLowerCase())
      );
      const signatureCatalog = [
        { id: 'authentication', test: /\b401\b|unauthori[sz]ed|invalid.*(?:key|token|credential)/i, cause: 'Credential/session rejection', checks: ['Confirm sandbox vs production credential type', 'Refresh scoped session material', 'Verify disposable-key expiry, domain, and operation scope'], retry: 'only-after-credentials-change' },
        { id: 'permission', test: /permission|notallowederror|denied.*(?:camera|microphone)/i, cause: 'Browser or OS media permission denial', checks: ['Use HTTPS', 'Request camera/microphone from a user gesture', 'Re-enumerate devices after permission changes'], retry: 'after-user-action' },
        { id: 'transport', test: /socket|transport|econn|websocket|ice|dtls/i, cause: 'Signaling or media transport failure', checks: ['Check socket and localSocket separately', 'Verify endpoint/TLS/firewall reachability', 'Remove duplicate listeners before reconnect'], retry: 'bounded-backoff-for-transient-failure' },
        { id: 'room-identity', test: /room.*(?:name|id).*(?:missing|invalid|mismatch)|meeting.*(?:missing|invalid)/i, cause: 'Provisional or invalid room identity', checks: ['Wait for the server-assigned room name', 'Do not start dependent workflows from the REST response alone'], retry: 'after-valid-room-identity' },
        { id: 'native-bridge', test: /native plugin|mediasoup.*bridge|webrtc.*bridge|missing.*binary/i, cause: 'Native media bridge/plugin unavailable', checks: ['Verify target-platform binary', 'Test a physical device/build target', 'Match SDK and native client versions'], retry: 'after-build-fix' },
        { id: 'rate-limit', test: /\b429\b|rate.?limit|too many requests/i, cause: 'Rate limit exceeded', checks: ['Honor Retry-After', 'Deduplicate create/join attempts', 'Add jitter and a maximum attempt count'], retry: 'server-directed-delay' }
      ];
      const findings = signatureCatalog
        .filter((signature) => signature.test.test(String(input.errorText ?? '')))
        .map(({ test, ...signature }) => signature);
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Runtime diagnosis prepared for ${manifest.title}`,
          confidence: findings.length > 0 || matches.length > 0 ? 'high' : 'low'
        }),
        diagnosis: {
          matchedPatterns: matches,
          findings,
          likelyCauses: findings.length > 0
            ? findings.map((finding) => finding.cause)
            : matches.length > 0 ? [`The error matched SDK pattern(s): ${matches.join(', ')}`]
              : ['No known signature matched. Capture sanitized room identity, transport state, and the first failure event.']
        }
      };
    }

    case 'remediation':
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Remediation steps prepared for ${manifest.title}`
        }),
        remediation: [
          'Re-run env.preflight',
          'Validate backend credentials and endpoint wiring',
          'Retry room.bootstrap and compare against first-success checklist'
        ]
      };

    case 'architecture-planner':
      return {
        ...buildBaseResponse({ manifest, adapter, input: safeInput, summary: 'Production frontend architecture plan generated', confidence: 'high' }),
        architecturePlan: buildFrontendArchitecturePlan({ input })
      };

    case 'headless-planner':
      return {
        ...buildBaseResponse({ manifest, adapter, input: safeInput, summary: 'Headless integration plan generated', confidence: 'high' }),
        headlessPlan: buildHeadlessPlan({ input })
      };

    case 'widget-planner':
      return {
        ...buildBaseResponse({ manifest, adapter, input: safeInput, summary: 'Secure widget integration plan generated', confidence: 'high' }),
        widgetPlan: buildWidgetPlan()
      };

    case 'telephony-planner':
      return {
        ...buildBaseResponse({ manifest, adapter, input: safeInput, summary: 'Telephony and AI call-control plan generated', confidence: 'high' }),
        telephonyPlan: buildTelephonyPlan()
      };

    case 'readiness-diagnostic': {
      const readiness = diagnoseReadiness(input);
      return {
        ...buildBaseResponse({
          manifest, adapter, input: safeInput,
          summary: readiness.ready ? 'Runtime readiness checks passed' : 'Runtime is not ready',
          confidence: 'high'
        }),
        readiness,
        status: readiness.ready ? 'success' : 'needs-action'
      };
    }

    case 'lifecycle-audit': {
      const lifecycle = auditLifecycle(input);
      return {
        ...buildBaseResponse({
          manifest, adapter, input: safeInput,
          summary: lifecycle.missing.length === 0 ? 'Lifecycle heuristics passed' : `${lifecycle.missing.length} lifecycle safeguards need review`,
          confidence: input.codeText ? 'medium' : 'low'
        }),
        lifecycle
      };
    }

    case 'credential-planner':
      return {
        ...buildBaseResponse({ manifest, adapter, input: safeInput, summary: 'Credential broker plan generated', confidence: 'high' }),
        credentialBrokerPlan: buildCredentialBrokerPlan()
      };

    default:
      return {
        ...buildBaseResponse({
          manifest,
          adapter,
          input: safeInput,
          summary: `Adapter kind '${adapter.kind}' returned generic adapter payload`
        }),
        adapter
      };
  }
};
