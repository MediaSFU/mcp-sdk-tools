---
id: shared
title: mediasfu-shared
generatedAt: "2026-06-18 19:53:24"
sourceLastModified: "2026-05-19 22:57:40"
---

This guide gives you the public setup path for the mediasfu-shared package and points to generated API references when you need exact signatures or types.

## Quick start

- Best for: Shared core logic across frameworks
- Package/artifact: `mediasfu-shared`
- Install: `npm i mediasfu-shared socket.io-client mediasoup-client`

---

## Start in 60 seconds

1. Install the package and peer dependencies: `npm i mediasfu-shared socket.io-client mediasoup-client`
2. Pick backend mode: MediaSFU Cloud or self-hosted MediaSFU Open.
3. Follow the first setup section below for your framework.

### Before you continue

- Best for: Shared core logic across frameworks
- New to MediaSFU? Start at [/sdks](/sdks) to compare frameworks quickly.

## Copy/paste starter

Use this minimal setup to validate your backend and socket path quickly.

```ts
import { connectSocket, SocketManager } from 'mediasfu-shared';

async function boot() {
  const socket = await connectSocket({
    apiUserName: process.env.MEDIASFU_API_USERNAME ?? '',
    apiKey: process.env.MEDIASFU_API_KEY ?? '',
    apiToken: process.env.MEDIASFU_API_TOKEN ?? '',
    link: process.env.MEDIASFU_SOCKET_URL ?? 'https://mediasfu.com/socket',
  });

  const socketManager = new SocketManager({ socket });
  return socketManager;
}
```
Keep credentials in environment variables and avoid committing secrets.

## Do not skip this order

1. Decide backend mode first: MediaSFU Cloud or your self-hosted deployment.
2. Validate the socket and auth path with one minimal happy-path request before wrapping the shared layer in framework code.
3. Add product-specific orchestration only after the backend and transport path are confirmed.
4. Use the generated API reference only when you need exact method or type signatures.

This order keeps connection and credential issues separate from wrapper or app-shell bugs.

## Choose your backend mode

| Mode | Best for | What you must provide |
| --- | --- | --- |
| **MediaSFU Cloud** | Fastest onboarding, managed infrastructure, less operational work | Cloud credentials stored in secure runtime or build configuration. |
| **MediaSFU Open / self-hosted** | Private infrastructure, local control, custom deployment requirements | A self-hosted MediaSFU-compatible endpoint plus the connection details your wrapper passes into the shared layer. |

If you have not made this choice yet, make it before going deeper into customization or API reference material.



## API reference

- Start with the portal overview at [/api-reference](/api-reference).
- Use the mediasfu-shared entry on that page to open the staged TypeDoc site for this package at `/api/shared/`.

Use the SDK guide for workflow guidance and the staged TypeDoc site for exact package details, generated symbols, and signatures.

## Common setup mistakes

- Skipping peer dependencies (`socket.io-client`, `mediasoup-client`).
- Using browser-only APIs in server contexts without guards.
- Hard-coding secrets in source instead of environment variables.
- Backend endpoint unreachable (Cloud credentials invalid or self-hosted server offline).
- Credentials committed directly in source files instead of secure environment configuration.

If setup fails, verify install → backend mode → credentials/local link in that order.

## Troubleshooting quick checks

| Check | Symptom | Quick fix |
| --- | --- | --- |
| Backend mode mismatch | Requests fail or hang | Confirm Cloud credentials or self-hosted URL, then re-test socket connection. |
| Credentials not loaded | Auth/connect errors | Verify env loading and pass credentials explicitly to SDK config. |
| Dependency mismatch | Build/install warnings | Reinstall dependencies and avoid force-install flags unless absolutely required. |

Use this table first before diving into deeper API sections.

## Production readiness checklist

- [ ] Backend mode decided (Cloud vs self-hosted) and documented.
- [ ] Credentials/keys sourced from secure environment config (not hard-coded).
- [ ] Peer dependencies installed and locked in package manager lockfile.
- [ ] Happy-path join/create flow validated end-to-end.
- [ ] Release build passes cleanly in the target app environment.

Mark all items before release.

---

# mediasfu-shared · [mediasfu-shared on npm](https://www.npmjs.com/package/mediasfu-shared)

**mediasfu-shared** is the framework-agnostic WebRTC runtime at the core of the MediaSFU SDK family. It provides shared room helpers, mediasoup signaling, socket management, media state utilities, and TypeScript types for React, Vue, Angular, Svelte, and plain TypeScript. Install with `npm install mediasfu-shared`.

`mediasfu-shared` is the framework-agnostic MediaSFU runtime package. It exposes the shared room helpers, mediasoup/socket flows, state utilities, and TypeScript types used by the MediaSFU SDK family.

## When To Use This Package

Use `mediasfu-shared` when you want to:

- build your own browser client on top of MediaSFU primitives without adopting a framework-specific UI package
- share MediaSFU room, media, and participant logic across React, Vue, Angular, Svelte, or plain TypeScript codebases
- import low-level helpers such as `createRoomOnMediaSFU`, `joinRoomOnMediaSFU`, `connectSocket`, `SocketManager`, and the exported consumers, methods, and types entry points

## Installation

```bash
npm install mediasfu-shared mediasoup-client socket.io-client
```

`mediasoup-client` and `socket.io-client` are peer dependencies, so install them in the host app.

## Backend Requirement

The cloud room helpers in this package target `https://mediasfu.com/v1/rooms/` by default.

- Use MediaSFU Cloud when you want managed room creation, signaling, and media routing. Pass `apiUserName` and `apiKey`.
- Use MediaSFU Open / Community Edition when you self-host. Pass a non-MediaSFU `localLink` such as `http://localhost:3000`.

## Quick Example

```ts
import {
  SocketManager,
  connectSocket,
  createRoomOnMediaSFU,
  joinRoomOnMediaSFU,
} from 'mediasfu-shared';

const createResult = await createRoomOnMediaSFU({
  payload: {
    action: 'create',
    userName: 'Ada',
    duration: 60,
    capacity: 10,
  },
  apiUserName: 'your-api-username',
  apiKey: 'your-64-character-api-key',
});

const joinResult = await joinRoomOnMediaSFU({
  payload: {
    action: 'join',
    meetingID: 'room123',
    userName: 'Ben',
  },
  apiUserName: 'your-api-username',
  apiKey: 'your-64-character-api-key',
});

const socket = await connectSocket({
  apiUserName: 'your-api-username',
  apiKey: 'your-64-character-api-key',
  apiToken: 'your-api-token',
  link: 'https://mediasfu.com/socket',
});

const socketManager = new SocketManager({ socket });

console.log(createResult.success, joinResult.success, socketManager.socket.connected);
```

## Import Paths

- `mediasfu-shared` exposes the full public runtime surface.
- `mediasfu-shared/consumers` is useful when you want consumer/grid helpers only.
- `mediasfu-shared/methods` is useful when you want action utilities and room helpers.
- `mediasfu-shared/types` is useful when you only need TypeScript contracts.

## Documentation

- Main docs: [https://mediasfu.com/documentation](https://mediasfu.com/documentation)
- User guide: [https://mediasfu.com/user-guide](https://mediasfu.com/user-guide)
- MediaSFU Open / CE: [https://github.com/MediaSFU/MediaSFUOpen](https://github.com/MediaSFU/MediaSFUOpen)

Generate package-local API docs with:

```bash
npm run build-docs
```

## Related Packages

| Package | Framework | npm |
|---------|-----------|-----|
| [mediasfu-reactjs](https://github.com/MediaSFU/MediaSFU-ReactJS) | React 18/19 | [`npm install mediasfu-reactjs`](https://www.npmjs.com/package/mediasfu-reactjs) |
| [mediasfu-vue](https://github.com/MediaSFU/MediaSFU-Vue) | Vue 3 / Composition API | [`npm install mediasfu-vue`](https://www.npmjs.com/package/mediasfu-vue) |
| [mediasfu-angular](https://github.com/MediaSFU/MediaSFU-Angular) | Angular 17/18/19 | [`npm install mediasfu-angular`](https://www.npmjs.com/package/mediasfu-angular) |
| [mediasfu-reactnative](https://www.npmjs.com/package/mediasfu-reactnative) | React Native | [`npm install mediasfu-reactnative`](https://www.npmjs.com/package/mediasfu-reactnative) |

## Support

- GitHub issues: [https://github.com/MediaSFU/MediaSFU-Shared/issues](https://github.com/MediaSFU/MediaSFU-Shared/issues)
- Email: info@mediasfu.com

## License

MIT. See [LICENSE](https://opensource.org/licenses/MIT).
