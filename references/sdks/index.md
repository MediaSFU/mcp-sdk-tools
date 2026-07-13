---
id: sdk-index
title: SDK Guides
slug: /sdks
---

Choose an SDK path by framework or native platform. Each guide starts with the package setup path and then points to deeper package documentation when a framework needs extra detail.

If you are starting fresh, choose your framework below and begin with its **Quick start** section.

Need signatures, types, or generated API details? Start at [/api-reference](/api-reference).

## If you do not want to get lost

1. Choose your SDK.
2. Choose your backend mode: MediaSFU Cloud or self-hosted MediaSFU Open.
3. Choose your room shape: general meeting, conference, webinar, broadcast, or chat-first.
4. Choose how much UI you want to keep: prebuilt, customized, or app-owned.

That order is the fastest path to a working room without mixing transport problems, framework setup, and UI customization into one debugging step.

## Choose your SDK

- [mediasfu-shared](/sdks/shared)
- [MediaSFU ReactJS](/sdks/reactjs)
- [MediaSFU Angular](/sdks/angular)
- [MediaSFU React Native](/sdks/react-native)
- [MediaSFU React Native Expo](/sdks/react-native-expo)
- [MediaSFU Vue](/sdks/vue)
- [MediaSFU Flutter](/sdks/flutter)
- [MediaSFU Kotlin](/sdks/kotlin)

## Which one should I choose?

- Pick **mediasfu-shared** when building your own framework wrapper or extending shared core behavior.
- Pick **ReactJS** for browser apps with direct component/state control.
- Pick **Angular** for DI-based integration and Angular-native app structure.
- Pick **React Native** for bare RN projects.
- Pick **React Native Expo** for Expo-managed workflows.
- Pick **Vue** for composition-friendly Vue applications.
- Pick **Flutter** for Dart/Flutter apps that need one codebase across mobile, web, and desktop.
- Pick **Kotlin** for native Android or Kotlin Multiplatform Compose surfaces.

## At a glance

| SDK | Install | Best for |
| --- | --- | --- |
| [mediasfu-shared](/sdks/shared) | `npm i mediasfu-shared socket.io-client mediasoup-client` | Shared core logic across frameworks |
| [MediaSFU ReactJS](/sdks/reactjs) | `npm i mediasfu-reactjs` | Web apps with full React control |
| [MediaSFU Angular](/sdks/angular) | `npm i mediasfu-angular` | Angular apps with DI-based wrappers |
| [MediaSFU React Native](/sdks/react-native) | `npm i mediasfu-reactnative` | Bare React Native mobile apps |
| [MediaSFU React Native Expo](/sdks/react-native-expo) | `npm i mediasfu-reactnative-expo` | Expo-managed mobile apps |
| [MediaSFU Vue](/sdks/vue) | `npm i mediasfu-vue` | Vue apps with composition-friendly APIs |
| [MediaSFU Flutter](/sdks/flutter) | `flutter pub add mediasfu_sdk` | Cross-platform Flutter apps across Android, iOS, web, desktop, and embedded surfaces |
| [MediaSFU Kotlin](/sdks/kotlin) | `implementation("com.mediasfu:mediasfu-sdk-android:1.0.1")` | Native Kotlin and Kotlin Multiplatform apps with Compose-first room surfaces |

## Choose your backend mode

| Mode | Best for | Read next |
| --- | --- | --- |
| **MediaSFU Cloud** | Managed infrastructure and the fastest route to a secure working room | [/usage/secure-backend-proxy](/usage/secure-backend-proxy) |
| **MediaSFU Open / self-hosted** | Private infrastructure, local control, and custom deployment ownership | [/usage/secure-backend-proxy](/usage/secure-backend-proxy) and [/sdks](/sdks) |

## Choose your room shape

| Room shape | Best for |
| --- | --- |
| **General meeting** | Team calls, product defaults, and the broadest starter path |
| **Conference** | Multi-speaker sessions, workshops, classes, and collaborative rooms |
| **Webinar** | Host-led events, audience participation, and stage-centric presentations |
| **Broadcast** | Livestream-style creator flows, host dashboards, and invite/share-heavy sessions |
| **Chat-first** | Support rooms, low-bandwidth collaboration, and messaging-led workflows |

Use the Angular gallery at [/sdks/angular](/sdks/angular) when you want concrete visual examples of how several of these room shapes look in a real SDK surface.

## Choose your UI ownership path

| If you want... | Start with |
| --- | --- |
| The fastest path with MediaSFU still rendering the visible room experience | [/usage/quickstart](/usage/quickstart) |
| The default room with targeted branding or surface changes | [/usage/ui-overrides](/usage/ui-overrides) |
| A larger custom workspace with MediaSFU still owning room runtime behavior | [/usage/custom-component](/usage/custom-component) |
| A fully app-owned shell driven by MediaSFU helpers | [/usage/headless](/usage/headless) and [/usage/choose-ui-mode](/usage/choose-ui-mode) |

## What these guides include

- Framework-specific setup paths for web, mobile, Flutter, Kotlin, and shared-core integrations.
- Install commands, first-room guidance, and links into the generated API reference for signatures and types.
- Pointers to package READMEs when a framework has deeper examples than the portal page can reasonably hold.
