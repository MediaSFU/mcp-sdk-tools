---
id: unity
title: MediaSFU Unity
generatedAt: "2026-06-08 00:00:00"
sourceLastModified: "2026-06-08 00:00:00"
---

This guide gives you the public setup path for using MediaSFU from Unity.

Use the Unity SDK path when your app or game needs MediaSFU rooms with a Unity-owned scene, interface, and media presentation layer.

## Quick start

- Best for: Unity apps, games, training tools, simulations, and interactive 3D experiences.
- Package/artifact: `com.mediasfu.unity`.
- Media dependency: `com.mediasfu.mediasoup-client-unity` provides the mediasoup/WebRTC bridge used for real media.
- Install: add the media client package first, then add the MediaSFU Unity SDK package.

---

## Start in 60 seconds

1. Install `com.mediasfu.mediasoup-client-unity`.
2. Install `com.mediasfu.unity`.
3. Pick backend mode: MediaSFU Cloud or self-hosted MediaSFU Open.
4. Attach a supported media backend for the target platform.
5. Join a room and connect media.

### Before you continue

- For browser apps, use [/sdks/reactjs](/sdks/reactjs), [/sdks/angular](/sdks/angular), or [/sdks/vue](/sdks/vue).
- For native Android or Kotlin Multiplatform apps, use [/sdks/kotlin](/sdks/kotlin).
- For Flutter apps, use [/sdks/flutter](/sdks/flutter).
- New to MediaSFU? Start at [/sdks](/sdks) to compare SDK paths quickly.

## Install

In Unity Package Manager:

1. Choose **Add package from git URL** or **Add package from disk** for `com.mediasfu.mediasoup-client-unity`.
2. Add `com.mediasfu.unity` after the media client package is installed.
3. Confirm your target platform includes a supported native WebRTC/mediasoup plugin.

When installing from local package folders during development, select each package's `package.json`.

## Copy/paste starter

Create the client, join a room, then connect the MediaSFU socket/media flow:

```csharp
using MediaSFU.Unity;

var client = new MediaSfuClient(
    new MediaSfuClientOptions
    {
        ConnectionMode = MediaSfuConnectionMode.Cloud,
        Credentials = new MediaSfuCredentials
        {
            ApiUserName = "your-api-username",
            ApiKey = "your-64-character-api-key"
        }
    }
);

var join = await client.JoinRoomAsync(
    new MediaSfuJoinRoomRequest
    {
        MeetingId = "s12345678",
        UserName = "player-one",
        IsLevel = "0"
    }
);

if (!join.Success)
{
    UnityEngine.Debug.LogError(join.Detail);
    return;
}

var connect = await client.ConnectMediaAsync();
if (!connect.Success)
{
    UnityEngine.Debug.LogError(connect.Detail);
}
```

## Attach real media

`com.mediasfu.unity` handles MediaSFU room creation, join flows, Socket.IO signaling, room state, moderation, and media orchestration.

Actual audio, video, screen capture, encoding, decoding, and rendering come from the media backend you attach for the target platform. The standard path is the Unity mediasoup client package:

```csharp
var deviceResult = MediaSfuNativePluginWebRtcEngine.TryCreateWebRtcDevice(
    new MediaSfuNativePluginWebRtcEngineOptions
    {
        EnableVerboseLogging = true
    });

if (!deviceResult.Success)
{
    UnityEngine.Debug.LogError(deviceResult.Detail);
    return;
}

client.AttachWebRtcDevice(deviceResult.Value);
```

Attach the media device before enabling microphone, camera, screen share, or remote playback.

## Choose your backend mode

| Mode | Best for | What you must provide |
| --- | --- | --- |
| **MediaSFU Cloud** | Fastest onboarding and managed infrastructure | Your MediaSFU account username and API key. |
| **MediaSFU Open / self-hosted** | Private infrastructure or custom deployment requirements | A self-hosted MediaSFU Open deployment plus the URL passed through `MediaSfuClientOptions.BaseUrl`. |

Cloud mode uses the MediaSFU Cloud room endpoint by default. Set `BaseUrl` only when using a self-hosted or custom backend.

## Notes

- Install `com.mediasfu.mediasoup-client-unity` before `com.mediasfu.unity` when you need real audio and video.
- Codec support comes from the attached native WebRTC backend, not from managed C# alone.
- Validate on the platform you plan to ship, not only in the Unity Editor.
- Keep live account values out of sample scenes or validation scripts after local testing.

## API reference

- Open the portal API reference hub at [/api-reference](/api-reference).
- Use the Unity SDK README and [API contract](https://github.com/MediaSFU/mediasfu-unity-sdk/blob/main/Documentation~/API_CONTRACT.md) for exact package symbols.
- Unity SDK repository: [MediaSFU/mediasfu-unity-sdk](https://github.com/MediaSFU/mediasfu-unity-sdk).

## Before you ship

Confirm room create/join, audio, camera video, screen share, and remote playback on the exact Unity builds you plan to distribute. Keep demo and validation values out of published scenes and packages.
