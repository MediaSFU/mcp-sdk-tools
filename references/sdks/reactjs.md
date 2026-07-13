---
id: reactjs
title: MediaSFU ReactJS
generatedAt: "2026-06-18 19:53:24"
sourceLastModified: "2026-05-19 22:58:33"
---

This guide gives you the public setup path for the MediaSFU ReactJS package and points to generated API references when you need exact signatures or types.

## Quick start

- Best for: Web apps with full React control
- Package/artifact: `mediasfu-reactjs`
- Install: `npm i mediasfu-reactjs`

---

## Start in 60 seconds

1. Install the package: `npm i mediasfu-reactjs`
2. Pick backend mode: MediaSFU Cloud or self-hosted MediaSFU Open.
3. Follow the first setup section below for your framework.

### Before you continue

- Best for: Web apps with full React control
- New to MediaSFU? Start at [/sdks](/sdks) to compare frameworks quickly.

## Copy/paste starter

Start with install + backend config, then follow the first integration section below.

```bash
npm i mediasfu-reactjs
```

```ts
export const mediaSFUConfig = {
  // Cloud mode
  credentials: {
    apiUserName: process.env.MEDIASFU_API_USERNAME ?? '',
    apiKey: process.env.MEDIASFU_API_KEY ?? '',
  },
  localLink: '',
  connectMediaSFU: true,
};
```

```ts
export const mediaSFULocalConfig = {
  // Self-hosted mode
  credentials: undefined,
  localLink: 'http://localhost:3000',
  connectMediaSFU: true,
};
```

## Do not skip this order

1. Decide backend mode first: MediaSFU Cloud or self-hosted MediaSFU Open.
2. Validate one successful create or join flow with the default room surface from this SDK.
3. Only then customize the shell, cards, or room ownership model.
4. Use the generated API reference when you need exact symbols or signatures, not as the first stop.

This order prevents most early confusion and keeps backend issues separate from UI customization work.

## Choose your backend mode

| Mode | Best for | What you must provide |
| --- | --- | --- |
| **MediaSFU Cloud** | Fastest onboarding, managed infrastructure, less operational work | Cloud credentials stored in secure runtime or build configuration. |
| **MediaSFU Open / self-hosted** | Private infrastructure, local control, custom deployment requirements | A self-hosted MediaSFU Open deployment plus the URL or config you pass into `localLink` or the equivalent connection setting. |

If you have not made this choice yet, make it before going deeper into customization or API reference material.



## API reference

- Start with the portal overview at [/api-reference](/api-reference).
- Use the MediaSFU ReactJS entry on that page to open the staged TypeDoc site for this package at `/api/reactjs/`.

Use the SDK guide for workflow guidance and the staged TypeDoc site for exact package details, generated symbols, and signatures.

## Common setup mistakes

- Using self-hosted mode without setting `localLink` to your server.
- Forgetting to pass credentials in cloud mode.
- Mixing cloud credentials with disabled `connectMediaSFU` during production tests.
- Backend endpoint unreachable (Cloud credentials invalid or self-hosted server offline).
- Credentials committed directly in source files instead of secure environment configuration.

If setup fails, verify install → backend mode → credentials/local link in that order.

## Troubleshooting quick checks

| Check | Symptom | Quick fix |
| --- | --- | --- |
| Backend mode mismatch | Join/create flow fails early | Confirm Cloud credentials for cloud mode, or set `localLink` for self-hosted mode. |
| Credentials not loaded | Auth/connect errors | Verify env loading and pass credentials explicitly to SDK config. |
| Dependency mismatch | Build/install warnings | Reinstall dependencies and avoid force-install flags unless absolutely required. |

Use this table first before diving into deeper API sections.

## Production readiness checklist

- [ ] Backend mode decided (Cloud vs self-hosted) and documented.
- [ ] Credentials/keys sourced from secure environment config (not hard-coded).
- [ ] SDK configuration is centralized and reused across app entrypoints.
- [ ] Happy-path join/create flow validated end-to-end.
- [ ] Release build passes cleanly in the target app environment.

Mark all items before release.

---

# MediaSFU ReactJS SDK · [mediasfu-reactjs on npm](https://www.npmjs.com/package/mediasfu-reactjs)

**mediasfu-reactjs** is the React 18/19 WebRTC SDK for video conferencing, webinars, live streaming, broadcast, screen sharing, whiteboard, chat, recording, live subtitles, translation, and AI agent rooms — powered by MediaSFU Cloud or your self-hosted MediaSFU Open server. Install with `npm install mediasfu-reactjs`.

---

# MediaSFU ReactJS SDK

`mediasfu-reactjs` is the React 18/19 package for shipping MediaSFU-powered calling, conferencing, webinar, chat, screen sharing, whiteboard, recording, subtitle, translation, and AI-assisted room experiences in the browser.

Use this package when you want one of three paths:

- render a prebuilt room fast with `MediasfuGeneric`, `MediasfuConference`, `MediasfuWebinar`, `MediasfuBroadcast`, or `MediasfuChat`
- render the same room runtime with the modern themed shell via `ModernMediasfuGeneric`
- keep the MediaSFU runtime and replace targeted UI surfaces with `uiOverrides`, custom cards, and custom shells
- run MediaSFU headless with `returnUI={false}` and own the full browser experience

## Start Here

```bash
npm install mediasfu-reactjs
```

```tsx
import { MediasfuGeneric } from "mediasfu-reactjs";

export default function App() {
  return (
    <MediasfuGeneric
      credentials={{ apiUserName: "your-api-username", apiKey: "your-api-key" }}
      connectMediaSFU={true}
    />
  );
}
```

Prefer the themed modern shell? Start with `ModernMediasfuGeneric` instead of `MediasfuGeneric`:

```tsx
import { ModernMediasfuGeneric } from 'mediasfu-reactjs';

export default function App() {
  return (
    <ModernMediasfuGeneric
      credentials={{ apiUserName: 'your-api-username', apiKey: 'your-api-key' }}
      containerStyle={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
      }}
    />
  );
}
```

## Backend Requirement

This SDK needs a MediaSFU-compatible backend for room lifecycle, signaling, and media routing.

| Option | Use it when | What to pass |
|---|---|---|
| MediaSFU Cloud | You want managed infrastructure | `credentials={{ apiUserName, apiKey }}` |
| MediaSFU Open / CE | You want to self-host | `localLink="http://your-server:3000"` and your own server config |

Cloud room helpers in this package target `https://mediasfu.com/v1/rooms/` by default. For self-hosted deployments, pass a non-MediaSFU `localLink`.

## Integration Paths

- Keep the bundled room UI for the fastest route to production.
- Use `ModernMediasfuGeneric` when you want the premium themed shell as your default entry point.
- Replace targeted surfaces with `uiOverrides`, custom cards, and custom shells.
- Use `customComponent` or `returnUI={false}` when your app should own the entire shell.

## Package Links

- Docs portal: [https://mediasfu.com/documentation](https://mediasfu.com/documentation)
- User guide: [https://mediasfu.com/user-guide](https://mediasfu.com/user-guide)
- Storybook: [https://mediasfu.com/storybook](https://mediasfu.com/storybook)
- Detailed guide: [README_DETAILED.md](#)

---

## 📖 Table of Contents

- Quick Start
- Installation
- Component Storybook
- Prebuilt Event Rooms
- Modern UI Components
- Usage Examples
- Key Components
- Customization
- API Reference
- Self-Hosting / Community Edition
- Advanced Features *(Panelists, Permissions, Translation)*
- sourceParameters - The Power API
- AudioGrid - Display All Audio Participants
- Using Modals Standalone
- Building Your Own UI
- SDKs for Every Framework
- Detailed Documentation

---

## 🚀 Quick Start

Three steps. Under 5 minutes. First video call live.

**1. Install**

```bash
npm install mediasfu-reactjs
```

**2. Import & Render**

```tsx
import { MediasfuGeneric } from 'mediasfu-reactjs';

function App() {
  return (
    <MediasfuGeneric
      credentials={{ apiUserName: "yourUsername", apiKey: "yourAPIKey" }}
    />
  );
}
```

**3. Run**

```bash
npm start
```

That's it. You have a fully-featured video conferencing room with screen sharing, chat, recording, and more.

> ℹ️ Critical component styles are automatically injected at runtime. For additional styling options, see Optional CSS Import.

> **Want to try without a server?** Use demo mode:
> ```tsx
> <MediasfuGeneric
>   useLocalUIMode={true}
>   useSeed={true}
>   seedData={{ member: "DemoUser", eventType: "conference" }}
> />
> ```

---

## 📦 Installation

```bash
# npm
npm install mediasfu-reactjs

# yarn
yarn add mediasfu-reactjs

# pnpm
pnpm add mediasfu-reactjs
```

### Peer Dependencies

The following are required peer dependencies:

```json
{
  "react": "^18.2.0 || ^19.0.0",
  "react-dom": "^18.2.0 || ^19.0.0",
  "@fortawesome/fontawesome-svg-core": "^6.0.0",
  "@fortawesome/free-solid-svg-icons": "^6.0.0",
  "@fortawesome/react-fontawesome": "^0.2.0",
  "bootstrap": "^5.0.0",
  "mediasoup-client": "^3.7.0",
  "socket.io-client": "^4.0.0",
  "universal-cookie": "^7.0.0"
}
```

### Optional Peer Dependencies

For **virtual background** support (blur, image backgrounds):

```bash
npm install @mediapipe/selfie_segmentation@0.1.1675465747
```

This is optional — if not installed, virtual backgrounds simply won't be available.

### Optional CSS Import

Critical styles for control buttons, containers, and core components are **automatically injected** at runtime — no manual import needed.

If you need additional styling (e.g., custom modal themes, waiting room lists), you can optionally import the full stylesheet:

```tsx
// Optional: Import for additional component styles
import 'mediasfu-reactjs/dist/main.css';
```

Most applications work perfectly without this import.

---

## 📚 Component Storybook

This package owns the React Storybook used for visual inspection of runtime-light MediaSFU surfaces. It is intended to sit beside the main Docusaurus docs portal, not replace it.

Run it from the `MediaSFUReactJS` package directory:

```bash
npm run storybook
```

Build the static Storybook output for deployment:

```bash
npm run build-storybook
```

For local visual inspection, the most reliable path in this repo is to serve the built `storybook-static` output after that command completes:

```bash
python3 -m http.server 6006 -d storybook-static
```

The dev server remains useful for iterative authoring, but its indexer can be stricter than the static build for generated TS-heavy stories.

Baseline stories for safe, presentational, or seeded modern components are generated automatically before both commands run. The current automated targets cover the modern widget barrel, a safe subset of display components, misc entry flows, most exported modal-style modern barrels, the whiteboard configuration modal, and `ModernMediasfuGeneric` in seeded local-UI mode. To refresh them directly:

```bash
npm run generate-storybook-stories
```

The initial stories live under `src/stories` and focus on components that do not need a live MediaSFU session:

- `UiOverridesGuide`
- `PremiumButton`
- `GradientCard`
- `GlassmorphicContainer`
- `ModernBackgroundModal`

Curated internal modal stories also live under `src/stories/InternalComponents` for `ModernPermissionsModal`, `ModernPanelistsModal`, and `TranslationSettingsModal`.

Curated display and canvas stories live under `src/stories/DisplayComponents` and `src/stories/WhiteboardComponents` for surfaces that are too stateful for the generated baseline set, including `ModernVideoCard`, `ModernAudioCard`, `ModernControlButtonsComponent`, `ModernPagination`, `ModernFlexibleGrid`, `ModernFlexibleVideo`, `ModernMainContainerComponent`, and the collaborative `Whiteboard` canvas.

That same display story surface now also includes classic display primitives that are still relevant in the mixed modern/classic room stack, including `MiniAudio`, `MiniCardAudio`, `ControlButtonsComponent`, `ControlButtonsAltComponent`, and `ControlButtonsComponentTouch`.

Generated baseline coverage is written to `src/stories/generated` and is intended for runtime-light or safely stubbed components only. Media-stream-driven and highly stateful meeting surfaces such as video grids, control stacks, pagination, and virtual-background flows still need curated stories with explicit fixtures.

If you want the public docs site to expose Storybook in navigation, deploy the generated `storybook-static` output separately and point the docs portal at it with `MEDIASFU_STORYBOOK_URL`.

---

## 🏛️ Prebuilt Event Rooms

Choose the room type that fits your use case — or use `MediasfuGeneric` for maximum flexibility:

| Component | Use Case | Description |
|-----------|----------|-------------|
| `MediasfuGeneric` | **Universal** | Supports all event types dynamically |
| `ModernMediasfuGeneric` | **Universal (Premium)** | Theme-aware, glassmorphism UI |
| `MediasfuConference` | **Meetings** | Multi-party video conferencing |
| `MediasfuWebinar` | **Webinars** | Presenters + audience model |
| `MediasfuBroadcast` | **Broadcasting** | One-to-many live streaming |
| `MediasfuChat` | **Chat Rooms** | Text-based with optional media |

All prebuilt components share the same props interface:

```tsx
interface MediasfuProps {
  // Authentication
  credentials?: { apiUserName: string; apiKey: string };
  
  // Connection
  localLink?: string;           // Self-hosted server URL
  connectMediaSFU?: boolean;    // Toggle auto-connection
  
  // Customization
  PrejoinPage?: (options) => ReactNode;
  customVideoCard?: CustomVideoCardType;
  customAudioCard?: CustomAudioCardType;
  customMiniCard?: CustomMiniCardType;
  uiOverrides?: MediasfuUICustomOverrides;
  
  // Advanced
  returnUI?: boolean;           // Set false for headless mode
  useLocalUIMode?: boolean;     // Demo/local mode
  seedData?: SeedData;          // Pre-populate for demos
}
```

---

## 💡 Usage Examples

### Basic Conference Room

```tsx
import { MediasfuConference } from 'mediasfu-reactjs';

function ConferenceApp() {
  return (
    <MediasfuConference
      credentials={{
        apiUserName: "yourUsername",
        apiKey: "yourAPIKey"
      }}
    />
  );
}
```

### Webinar with Custom Branding

```tsx
import { MediasfuWebinar, PreJoinPage } from 'mediasfu-reactjs';

function WebinarApp() {
  return (
    <MediasfuWebinar
      credentials={{ apiUserName: "user", apiKey: "key" }}
      PrejoinPage={(options) => (
        <PreJoinPage
          {...options}
          imgSrc="/your-logo.png"
        />
      )}
      containerStyle={{
        background: "linear-gradient(135deg, #1a1a2e, #16213e)"
      }}
    />
  );
}
```

### Demo/Preview Mode (No Server)

```tsx
import { 
  MediasfuGeneric, 
  generateRandomParticipants,
  generateRandomMessages 
} from 'mediasfu-reactjs';

function DemoApp() {
  return (
    <MediasfuGeneric
      useLocalUIMode={true}
      useSeed={true}
      seedData={{
        member: "DemoUser",
        participants: generateRandomParticipants({ count: 5 }),
        messages: generateRandomMessages({ count: 10 }),
        eventType: "conference"
      }}
    />
  );
}
```

### Custom Video Cards

```tsx
import { MediasfuGeneric, VideoCard, CustomVideoCardType } from 'mediasfu-reactjs';

const customVideoCard: CustomVideoCardType = (props) => (
  <VideoCard
    {...props}
    customStyle={{
      border: "3px solid #4c1d95",
      borderRadius: 20,
      boxShadow: "0 10px 40px rgba(76, 29, 149, 0.4)"
    }}
  />
);

function App() {
  return (
    <MediasfuGeneric
      credentials={{ apiUserName: "user", apiKey: "key" }}
      customVideoCard={customVideoCard}
    />
  );
}
```

### Headless Mode (Custom UI)

```tsx
import { MediasfuGeneric } from 'mediasfu-reactjs';
import { useState, useCallback } from 'react';

function CustomApp() {
  const [helpers, setHelpers] = useState<Record<string, unknown>>({});
  
  const updateSourceParameters = useCallback((data: Record<string, unknown>) => {
    setHelpers(data);
  }, []);
  
  return (
    <>
      <MediasfuGeneric
        credentials={{ apiUserName: "user", apiKey: "key" }}
        returnUI={false}  // No default UI
        noUIPreJoinOptions={{
          action: "create",
          capacity: 10,
          eventType: "conference",
          userName: "Host"
        }}
        sourceParameters={helpers}
        updateSourceParameters={updateSourceParameters}
      />
      
      {/* Use `helpers` to build your completely custom UI */}
      {/* helpers.clickVideo(), helpers.clickAudio(), helpers.participants, etc. */}
    </>
  );
}
```

### UI Overrides

```tsx
import { 
  MediasfuGeneric, 
  MainContainerComponent,
  MediasfuUICustomOverrides 
} from 'mediasfu-reactjs';

const overrides: MediasfuUICustomOverrides = {
  // Override component rendering
  mainContainer: {
    render: (props) => (
      <div style={{ border: "4px dashed purple", padding: 16 }}>
        <MainContainerComponent {...props} />
      </div>
    )
  },
  
  // Wrap function behavior
  consumerResume: {
    wrap: (originalFn) => async (params) => {
      console.log("Consumer resuming:", params);
      return await originalFn(params);
    }
  }
};

function App() {
  return (
    <MediasfuGeneric
      credentials={{ apiUserName: "user", apiKey: "key" }}
      uiOverrides={overrides}
    />
  );
}
```

---

## 🧩 Key Components

### Display Components

| Component | Purpose |
|-----------|---------|
| `MainContainerComponent` | Root container for meeting UI |
| `MainGridComponent` | Grid layout for video tiles |
| `FlexibleGrid` | Dynamic responsive grid |
| `VideoCard` | Individual video participant |
| `AudioCard` | Audio-only participant with waveform |
| `MiniCard` | Thumbnail participant card |
| `Pagination` | Navigate participant pages |

### Modal Components

| Component | Purpose |
|-----------|---------|
| `LoadingModal` | Loading overlay |
| `AlertComponent` | Toast notifications |
| `ParticipantsModal` | Participant list/management |
| `MessagesModal` | Chat interface |
| `RecordingModal` | Recording controls |
| `PollModal` | Create/vote on polls |
| `BackgroundModal` | Virtual backgrounds |
| `BreakoutRoomsModal` | Breakout room management |
| `ConfigureWhiteboardModal` | Whiteboard settings |
| `MediaSettingsModal` | Audio/video device selection |

### Control Methods

```tsx
import { 
  clickVideo,      // Toggle video
  clickAudio,      // Toggle audio
  clickScreenShare, // Toggle screen share
  startRecording,   // Start recording
  stopRecording,    // Stop recording
  launchPoll,       // Open poll modal
  launchMessages,   // Open chat modal
} from 'mediasfu-reactjs';
```

### Socket Events

```tsx
import { 
  connectSocket,
  disconnectSocket,
  joinRoomClient,
  // Event handlers
  personJoined,
  meetingEnded,
  receiveMessage,
} from 'mediasfu-reactjs';
```

---

## 🎨 Customization

### CSS Variables

The package uses CSS variables for theming:

```css
:root {
  --mediasfu-primary: #4c1d95;
  --mediasfu-background: #1a1a2e;
  --mediasfu-surface: #16213e;
  --mediasfu-text: #ffffff;
}
```

### Custom Cards

```tsx
// Custom video card with overlay
const customVideoCard: CustomVideoCardType = (props) => (
  <div style={{ position: 'relative' }}>
    <VideoCard {...props} />
    <div className="custom-overlay">
      <span>{props.name}</span>
      <button onClick={() => props.onMute?.()}>Mute</button>
    </div>
  </div>
);
```

### Complete UI Override

```tsx
const overrides: MediasfuUICustomOverrides = {
  // Layout components
  mainContainer: { render: CustomMainContainer },
  mainGrid: { render: CustomGrid },
  
  // Modal components
  menuModal: { component: CustomMenuModal },
  participantsModal: { component: CustomParticipantsModal },
  messagesModal: { component: CustomMessagesModal },
  
  // Functions
  consumerResume: { wrap: loggingWrapper },
  addVideosGrid: { implementation: customGridLogic },
};
```

---

## 📚 API Reference

### Types

```tsx
import type {
  // Core types
  Participant,
  Stream,
  Message,
  CoHostResponsibility,
  Poll,
  
  // Event types
  EventType,              // 'conference' | 'webinar' | 'chat' | 'broadcast'
  CreateMediaSFURoomOptions,
  JoinMediaSFURoomOptions,
  ResponseJoinRoom,
  
  // UI types
  MediasfuUICustomOverrides,
  CustomVideoCardType,
  CustomAudioCardType,
  CustomMiniCardType,
  
  // Socket types
  ConnectSocketType,
  ConnectLocalSocketType,
} from 'mediasfu-reactjs';
```

### Utilities

```tsx
import {
  // Room management
  joinRoomOnMediaSFU,
  createRoomOnMediaSFU,
  checkLimitsAndMakeRequest,
  
  // Demo utilities
  generateRandomParticipants,
  generateRandomMessages,
  generateRandomPolls,
  
  // State
  initialValuesState,
  
  // Helpers
  formatNumber,
  sleep,
  checkPermission,
} from 'mediasfu-reactjs';
```

---

## 🏠 Self-Hosting / Community Edition

For self-hosted MediaSFU servers:

```tsx
<MediasfuGeneric
  localLink="https://your-mediasfu-server.com"
  connectMediaSFU={false}  // Don't connect to cloud
/>
```

### Hybrid Mode (Local + Cloud)

```tsx
<MediasfuGeneric
  localLink="https://your-server.com"
  connectMediaSFU={true}   // Also connect to MediaSFU cloud
  credentials={{ apiUserName: "user", apiKey: "key" }}
/>
```

---

## 📖 Detailed Documentation

For comprehensive documentation including:

- Advanced customization patterns
- Full API reference
- All component props
- Socket event handling
- Recording configuration
- Breakout rooms
- Whiteboard integration
- And much more...

**📄 See [README_DETAILED.md](#)**

---

## 🎨 Modern UI Components

`ModernMediasfuGeneric` is the most advanced, themed variant featuring:

- **Premium glass-morphism design** with backdrop blur effects
- **Smooth animations** and micro-interactions
- **Dark/Light theme** support built-in
- **Accessibility-first** components
- **Responsive layouts** for all screen sizes

```tsx
import { ModernMediasfuGeneric } from 'mediasfu-reactjs';

function App() {
  return (
    <ModernMediasfuGeneric
      credentials={{ apiUserName: "user", apiKey: "key" }}
      containerStyle={{
        background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
        minHeight: "100vh"
      }}
    />
  );
}
```

### Modern Components Available

| Modern Component | Classic Equivalent | Features |
|-----------------|-------------------|----------|
| `ModernVideoCard` | `VideoCard` | Glass effect, animated borders |
| `ModernAudioCard` | `AudioCard` | Gradient waveforms, glow effects |
| `ModernMiniCard` | `MiniCard` | Sleek thumbnails with status |
| `ModernMenuModal` | `MenuModal` | Slide animations, blur backdrop |
| `ModernMessagesModal` | `MessagesModal` | Chat bubbles, typing indicators |
| `ModernRecordingModal` | `RecordingModal` | Status animations, progress rings |
| `ModernParticipantsModal` | `ParticipantsModal` | Search, filters, role badges |
| `ModernBackgroundModal` | `BackgroundModal` | Image gallery, blur previews |
| `ModernPollModal` | `PollModal` | Real-time voting, animations |
| `ModernBreakoutRoomsModal` | `BreakoutRoomsModal` | Drag-and-drop, room previews |
| `ModernPanelistsModal` | `PanelistsModal` | Panelist management for webinars |
| `ModernPermissionsModal` | `PermissionsModal` | Per-participant permission control |
| `TranslationSettingsModal` | — | Real-time translation configuration |

---

## 🌐 Advanced Features

### Panelists Mode (Webinars)

In webinar mode, designate specific participants as **panelists** who can speak, while others remain audience members.

```tsx
// Panelists are managed via sourceParameters
const { panelists, updatePanelists } = sourceParameters;

// Listen for panelist changes
// Events: panelistsUpdated, addedAsPanelist, removedFromPanelists, panelistFocusChanged
```

### Individual Permissions

Control each participant's capabilities individually:

```tsx
import { ModernPermissionsModal } from 'mediasfu-reactjs';

// Permission levels:
// "0" - Standard participant
// "1" - Elevated (co-host level)
// "2" - Host (full control)

// Configure per-participant capabilities:
// - Video on/off
// - Audio on/off
// - Screen sharing
// - Chat access
```

### Real-time Translation 🌍

Enable participants to **speak in their native language** and **listen in any language** with live AI translation.

```tsx
import { TranslationSettingsModal } from 'mediasfu-reactjs';

function TranslationExample({ sourceParameters }) {
  const [showTranslation, setShowTranslation] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowTranslation(true)}>
        🌐 Translation Settings
      </button>
      
      <TranslationSettingsModal
        isVisible={showTranslation}
        onClose={() => setShowTranslation(false)}
        parameters={sourceParameters}
      />
    </>
  );
}

// Translation events available:
// - translation:roomConfig
// - translation:languageSet
// - translation:subscribed
// - translation:transcript
```

Features include:
- **Set your spoken language** — The system knows what language you're speaking
- **Choose listening language** — Hear others translated to your preferred language
- **Real-time transcription** — See live transcripts
- **Multiple language support** — 50+ languages available

---

## 🔧 sourceParameters - The Power API

When building custom UIs or using headless mode (`returnUI={false}`), you need **both** props:

| Prop | Purpose |
|------|---------|
| `sourceParameters` | Initial state object (can be empty `{}`) |
| `updateSourceParameters` | Callback that receives the complete helper bundle |

The `updateSourceParameters` callback delivers a comprehensive object containing **all room state, methods, and streams**. This is your bridge to building completely custom UIs.

```tsx
import { MediasfuGeneric } from 'mediasfu-reactjs';
import { useState, useCallback } from 'react';

function CustomUI() {
  const [helpers, setHelpers] = useState<Record<string, unknown>>({});

  // This callback receives ALL MediaSFU state and methods
  const updateSourceParameters = useCallback((data: Record<string, unknown>) => {
    setHelpers(data);
  }, []);

  return (
    <>
      <MediasfuGeneric
        credentials={{ apiUserName: "user", apiKey: "key" }}
        returnUI={false}  // Headless mode - no UI rendered
        noUIPreJoinOptions={{
          action: "create",
          capacity: 10,
          eventType: "conference",
          userName: "Host"
        }}
        sourceParameters={helpers}           // Required: pass state object
        updateSourceParameters={updateSourceParameters}  // Required: receive updates
      />
      
      {helpers.validated && <MyCustomMeetingUI sourceParameters={helpers} />}
    </>
  );
}
```

### Key sourceParameters Properties

#### Media Streams

```tsx
const {
  allVideoStreams,    // All video MediaStream objects
  allAudioStreams,    // All audio MediaStream objects
  localStream,        // Your local camera stream
  localStreamAudio,   // Your local microphone stream
  localStreamScreen,  // Your screen share stream (if active)
  remoteScreenStream, // Remote screen share stream
} = sourceParameters;
```

#### Participant Data

```tsx
const {
  participants,           // Full participant list
  participantsCounter,    // Current count
  filteredParticipants,   // Filtered by search
  waitingRoomList,        // Users in waiting room
  coHost,                 // Current co-host name
  member,                 // Your username
  islevel,                // Your permission level ('0', '1', '2')
  youAreHost,             // Boolean
  youAreCoHost,           // Boolean
} = sourceParameters;
```

#### Room State

```tsx
const {
  roomName,           // Current room name
  eventType,          // 'conference' | 'webinar' | 'broadcast' | 'chat'
  recordStarted,      // Is recording active
  recordPaused,       // Is recording paused
  shareScreenStarted, // Is screen sharing active
  validated,          // Is room validated/connected
  messages,           // Chat messages array
  polls,              // Active polls
} = sourceParameters;
```

### Helper Methods

#### `getParticipantMedia` - Get Individual Streams

```tsx
const { getParticipantMedia } = sourceParameters;

// Get video stream by participant name
const videoStream = await getParticipantMedia({
  name: "Alice",
  kind: "video"
});

// Get audio stream by producer ID
const audioStream = await getParticipantMedia({
  id: "producer-id-123",
  kind: "audio"
});

// Use in a video element
if (videoStream) {
  videoRef.current.srcObject = videoStream;
}
```

#### Media Control Methods

```tsx
const {
  clickVideo,         // Toggle local video
  clickAudio,         // Toggle local audio
  clickScreenShare,   // Toggle screen share
  switchVideoAlt,     // Switch camera device
  switchUserAudio,    // Switch audio input device
} = sourceParameters;

// Toggle video with parameters
await clickVideo({ parameters: sourceParameters });
```

#### Modal Toggles

```tsx
const {
  updateIsMenuModalVisible,
  updateIsRecordingModalVisible,
  updateIsParticipantsModalVisible,
  updateIsMessagesModalVisible,
  updateIsPollModalVisible,
  updateIsBackgroundModalVisible,
  updateIsBreakoutRoomsModalVisible,
  updateIsMediaSettingsModalVisible,
} = sourceParameters;

// Open the chat modal
updateIsMessagesModalVisible(true);
```

---

## 🎵 AudioGrid - Display All Audio Participants

Use `AudioGrid` with audio streams from `sourceParameters`:

```tsx
import { AudioGrid, AudioCard } from 'mediasfu-reactjs';

function AudioParticipantsView({ sourceParameters }) {
  const { allAudioStreams, participants } = sourceParameters;

  // Build audio components from streams
  const audioComponents = allAudioStreams.map((streamObj, index) => {
    const participant = participants.find(p => p.audioID === streamObj.producerId);
    
    return (
      <AudioCard
        key={streamObj.producerId || index}
        name={participant?.name || 'Unknown'}
        audioStream={streamObj.stream}
        showWaveform={true}
        barColor="#22c55e"
        customStyle={{
          background: "rgba(34, 197, 94, 0.1)",
          borderRadius: 16,
          padding: 12
        }}
      />
    );
  });

  return (
    <AudioGrid
      componentsToRender={audioComponents}
      containerProps={{
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          padding: 20
        }
      }}
    />
  );
}
```

---

## 🎬 Using Modals Standalone

You can use any modal component independently with `sourceParameters`:

### Recording Modal

```tsx
import { ModernRecordingModal } from 'mediasfu-reactjs';

function MyRecordingButton({ sourceParameters }) {
  const [showRecording, setShowRecording] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowRecording(true)}>
        🔴 Recording Settings
      </button>
      
      <ModernRecordingModal
        isVisible={showRecording}
        onClose={() => setShowRecording(false)}
        parameters={sourceParameters}
        position="center"
      />
    </>
  );
}
```

### Virtual Background Modal

```tsx
import { ModernBackgroundModal } from 'mediasfu-reactjs';

function BackgroundSelector({ sourceParameters }) {
  const [showBg, setShowBg] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowBg(true)}>
        🖼️ Change Background
      </button>
      
      <ModernBackgroundModal
        isVisible={showBg}
        onClose={() => setShowBg(false)}
        parameters={sourceParameters}
      />
    </>
  );
}
```

### Media Settings Modal

```tsx
import { ModernMediaSettingsModal } from 'mediasfu-reactjs';

function DeviceSelector({ sourceParameters }) {
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowSettings(true)}>
        ⚙️ Audio/Video Settings
      </button>
      
      <ModernMediaSettingsModal
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        parameters={sourceParameters}
      />
    </>
  );
}
```

---

## 🏗️ Building Your Own UI

Here's a complete example of building a custom meeting interface:

```tsx
import { 
  MediasfuGeneric,
  VideoCard,
  AudioCard,
  ModernMessagesModal,
  ModernParticipantsModal,
  ModernRecordingModal,
} from 'mediasfu-reactjs';
import { useState, useEffect } from 'react';

function CustomMeetingApp() {
  const [params, setParams] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showRecording, setShowRecording] = useState(false);

  if (!params?.validated) {
    return (
      <MediasfuGeneric
        credentials={{ apiUserName: "user", apiKey: "key" }}
        returnUI={true}  // Show pre-join UI
        updateSourceParameters={setParams}
      />
    );
  }

  const {
    participants,
    allVideoStreams,
    allAudioStreams,
    member,
    roomName,
    clickVideo,
    clickAudio,
    clickScreenShare,
    videoAlreadyOn,
    audioAlreadyOn,
    shareScreenStarted,
    recordStarted,
  } = params;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
      {/* Header */}
      <header style={{ padding: 16, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
        <h1 style={{ color: 'white', margin: 0 }}>{roomName}</h1>
        <span style={{ color: '#94a3b8' }}>{participants.length} participants</span>
      </header>

      {/* Video Grid */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: 16 }}>
        {allVideoStreams.map((stream, i) => {
          const participant = participants.find(p => p.videoID === stream.producerId);
          return (
            <VideoCard
              key={stream.producerId || i}
              videoStream={stream.stream}
              name={participant?.name || 'Unknown'}
              customStyle={{ borderRadius: 16, overflow: 'hidden' }}
            />
          );
        })}
      </main>

      {/* Controls */}
      <footer style={{ padding: 16, borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center', gap: 16 }}>
        <button 
          onClick={() => clickVideo({ parameters: params })}
          style={{ 
            padding: '12px 24px', 
            borderRadius: 12,
            background: videoAlreadyOn ? '#22c55e' : '#ef4444',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {videoAlreadyOn ? '📹 Video On' : '📹 Video Off'}
        </button>

        <button 
          onClick={() => clickAudio({ parameters: params })}
          style={{ 
            padding: '12px 24px', 
            borderRadius: 12,
            background: audioAlreadyOn ? '#22c55e' : '#ef4444',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {audioAlreadyOn ? '🎤 Mic On' : '🎤 Mic Off'}
        </button>

        <button onClick={() => setShowParticipants(true)} style={{ padding: '12px 24px', borderRadius: 12, background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}>
          👥 Participants
        </button>

        <button onClick={() => setShowChat(true)} style={{ padding: '12px 24px', borderRadius: 12, background: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer' }}>
          💬 Chat
        </button>

        <button onClick={() => setShowRecording(true)} style={{ padding: '12px 24px', borderRadius: 12, background: recordStarted ? '#ef4444' : '#6b7280', color: 'white', border: 'none', cursor: 'pointer' }}>
          🔴 Record
        </button>
      </footer>

      {/* Modals */}
      <ModernMessagesModal
        isVisible={showChat}
        onClose={() => setShowChat(false)}
        parameters={params}
      />

      <ModernParticipantsModal
        isVisible={showParticipants}
        onClose={() => setShowParticipants(false)}
        parameters={params}
      />

      <ModernRecordingModal
        isVisible={showRecording}
        onClose={() => setShowRecording(false)}
        parameters={params}
      />
    </div>
  );
}
```

---

## �️ SDKs for Every Framework

MediaSFU isn't just React. The same communication platform is available across 7 frameworks — same API surface, same capabilities, same pricing:

| Framework | Package |
|-----------|---------|
| **React** | [mediasfu-reactjs](https://www.npmjs.com/package/mediasfu-reactjs) (you are here) |
| **React Native** | [@mediasfu/mediasfu-reactnative](https://www.npmjs.com/package/@mediasfu/mediasfu-reactnative) |
| **Expo** | [@mediasfu/mediasfu-reactnative-expo](https://www.npmjs.com/package/@mediasfu/mediasfu-reactnative-expo) |
| **Flutter** | [mediasfu_sdk](https://pub.dev/packages/mediasfu_sdk) |
| **Angular** | [@mediasfu/mediasfu-angular](https://www.npmjs.com/package/@mediasfu/mediasfu-angular) |
| **Vue** | [@mediasfu/mediasfu-vue](https://www.npmjs.com/package/@mediasfu/mediasfu-vue) |
| **Android (Kotlin)** | MediaSFU Android |

---

## �🔗 Links

- **Website**: [mediasfu.com](https://www.mediasfu.com)
- **Documentation**: [mediasfu.com/reactjs](https://www.mediasfu.com/reactjs/)
- **API Documentation**: [mediasfu.com/developers](https://mediasfu.com/developers)
- **MediaSFU Open**: [github.com/MediaSFU/MediaSFUOpen](https://github.com/MediaSFU/MediaSFUOpen)
- **Sandbox**: [mediasfu.com/sandbox](https://www.mediasfu.com/sandbox)
- **Community Forum**: [mediasfu.com/forums](https://www.mediasfu.com/forums)
- **GitHub**: [github.com/MediaSFU](https://github.com/MediaSFU)

---

## 📄 License

MIT © [MediaSFU](https://www.mediasfu.com)

---

## Related SDKs

| Package | Framework | npm |
|---------|-----------|-----|
| **[mediasfu-reactjs](https://github.com/MediaSFU/MediaSFU-ReactJS)** | **React 18/19** | **this package** |
| [mediasfu-vue](https://github.com/MediaSFU/MediaSFU-Vue) | Vue 3 | [`npm install mediasfu-vue`](https://www.npmjs.com/package/mediasfu-vue) |
| [mediasfu-angular](https://github.com/MediaSFU/MediaSFU-Angular) | Angular 17+ | [`npm install mediasfu-angular`](https://www.npmjs.com/package/mediasfu-angular) |
| [mediasfu-shared](https://github.com/MediaSFU/MediaSFU-Shared) | Framework-agnostic | [`npm install mediasfu-shared`](https://www.npmjs.com/package/mediasfu-shared) |

---

  Voice · Video · AI · Translation · 7 Frameworks · $0.10/1K min
