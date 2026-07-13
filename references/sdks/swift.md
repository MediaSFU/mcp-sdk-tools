---
id: swift
title: MediaSFU Swift
generatedAt: "2026-06-08 00:00:00"
sourceLastModified: "2026-06-08 00:00:00"
---

This guide gives you the public setup path for using MediaSFU from a native Swift app on Apple platforms.

Use the Swift SDK path when your app is written in UIKit or SwiftUI and you want to present a MediaSFU room with native Apple project tooling.

## Quick start

- Best for: Native iOS, iPadOS, and macOS apps that need a Swift entry point into MediaSFU rooms.
- Package/artifact: `MediaSFUAppleSDK`.
- Media dependency: `MediaSFUMediasoupClient` is pulled by the Apple SDK for native mediasoup/WebRTC integration.
- Install: add `https://github.com/MediaSFU/mediasfu-apple-sdk.git` with Swift Package Manager.

---

## Start in 60 seconds

1. Add the MediaSFU Apple SDK Swift package to your Xcode project.
2. Pick backend mode: MediaSFU Cloud or self-hosted MediaSFU Open.
3. Present the hosted MediaSFU controller from Swift.
4. Run once on your target Apple device or simulator profile.

### Before you continue

- For Android or shared Kotlin Multiplatform surfaces, use [/sdks/kotlin](/sdks/kotlin).
- For Flutter apps, use [/sdks/flutter](/sdks/flutter).
- New to MediaSFU? Start at [/sdks](/sdks) to compare SDK paths quickly.

## Install

In Xcode, open **Package Dependencies**, add this package URL, and select the `MediaSFUAppleSDK` product:

```text
https://github.com/MediaSFU/mediasfu-apple-sdk.git
```

If you manage dependencies from `Package.swift`, add the package and product:

```swift
dependencies: [
    .package(url: "https://github.com/MediaSFU/mediasfu-apple-sdk.git", from: "0.1.3")
]
```

```swift
.target(
    name: "YourAppTarget",
    dependencies: [
        .product(name: "MediaSFUAppleSDK", package: "mediasfu-apple-sdk")
    ]
)
```

Add the camera and microphone usage strings required by iOS:

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera for video rooms.</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app uses the microphone for audio rooms.</string>
```

Then import the SDK from Swift:

```swift
import MediaSFUAppleSDK
```

## Copy/paste starter

Hosted UI mode is the fastest path. It presents the shared MediaSFU room experience from your Swift app.

```swift
import MediaSFUAppleSDK

let bridge = MediaSFUIosHostBridge()
let config = bridge.makeLaunchConfig()

config.apiUserName = "your-api-username"
config.apiKey = "your-64-character-api-key"
config.localLink = ""
config.connectMediaSFU = true
config.userName = "alice"
config.roomName = "mediasfu-demo"
config.action = "create"
config.eventType = "conference"
config.durationMinutes = 60
config.capacity = 100
config.autoProceed = false
config.useModernUI = true
config.useModernTheme = true

let controller = bridge.makeHostViewController(config: config)
controller.modalPresentationStyle = .fullScreen
present(controller, animated: true)
```

## No-UI create and join

Use `autoProceed = true` when your app owns the setup screen and wants MediaSFU to enter the room without showing the prejoin UI.

For create:

```swift
let bridge = MediaSFUIosHostBridge()
let config = bridge.makeLaunchConfig()

config.apiUserName = "your-api-username"
config.apiKey = "your-64-character-api-key"
config.connectMediaSFU = true
config.localLink = ""
config.action = "create"
config.userName = "host1"
config.eventType = "conference"
config.durationMinutes = 60
config.capacity = 100
config.autoProceed = true

let controller = bridge.makeHostViewController(config: config)
present(controller, animated: true)
```

For join:

```swift
let bridge = MediaSFUIosHostBridge()
let config = bridge.makeLaunchConfig()

config.apiUserName = "your-api-username"
config.apiKey = "your-64-character-api-key"
config.connectMediaSFU = true
config.localLink = ""
config.action = "join"
config.roomName = "s1234567"
config.userName = "guest1"
config.adminPasscode = ""
config.islevel = "0"
config.autoProceed = true

let controller = bridge.makeHostViewController(config: config)
present(controller, animated: true)
```

## Media controls from Swift

After the hosted room is mounted, your app can request common media actions through the bridge:

```swift
let didRequestAudio = bridge.triggerToggleAudio()
let didRequestVideo = bridge.triggerToggleVideo()
let didRequestScreenShare = bridge.triggerToggleScreenShare()
```

These methods return `false` if the room surface has not installed its handler yet. Call them after the controller has been presented and the room UI is active.

## Native mediasoup/WebRTC bridge

The Apple SDK can install the native mediasoup/WebRTC bridge when your app needs real device media through the Swift package stack:

```swift
import MediaSFUAppleSDK
import MediaSFUMediasoupClient

let nativeDevice = MSCDevice()
let adapter = MediaSFUMediasoupClientBridgeFactory.makeInstallableAdapter(device: nativeDevice)
let mediaBridge = DeviceBackedMediasoupBridge(device: adapter)

MediaSFUKmpBridgeInstaller.installBridgeIfSupported(mediaBridge)
```

The underlying Apple mediasoup client supports Opus, PCMU, PCMA, DTMF, VP8, VP9, H.264, RTX, RED, and FEC when the real native WebRTC/libmediasoupclient artifacts are staged for the target.

## Choose your backend mode

| Mode | Best for | What you must provide |
| --- | --- | --- |
| **MediaSFU Cloud** | Fastest onboarding and managed infrastructure | Your MediaSFU account username and API key. |
| **MediaSFU Open / self-hosted** | Private infrastructure or custom deployment requirements | A self-hosted MediaSFU Open deployment plus the root URL passed through `localLink`. |

Leave `localLink` empty for MediaSFU Cloud. Use `localLink` only for a self-hosted or private backend root, such as `https://your-mediasfu-host.example.com`.

## API reference

- Start with the portal overview at [/api-reference](/api-reference).
- Use this guide for setup flow and the package README for the currently published Swift symbols.
- Apple SDK repository: [MediaSFU/mediasfu-apple-sdk](https://github.com/MediaSFU/mediasfu-apple-sdk).
- Native mediasoup client repository: [MediaSFU/mediasfu-mediasoup-client-apple](https://github.com/MediaSFU/mediasfu-mediasoup-client-apple).

## Notes

- Leave `localLink` empty for MediaSFU Cloud and use it only for a self-hosted or private backend root.
- Configure camera and microphone permissions for the app target before you present the room.
- Validate camera, microphone, and screen-share behavior on the Apple devices you plan to support.
- Keep live account values out of sample snippets or demo screens after integration.

## Before you ship

Confirm room create/join, camera, microphone, and screen-share flows on the Apple devices you support. Keep demo and validation values out of the app build you distribute, then run your usual Xcode archive or CI build after adding the Swift packages.
