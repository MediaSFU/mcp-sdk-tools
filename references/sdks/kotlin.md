---
id: kotlin
title: MediaSFU Kotlin
generatedAt: "2026-06-18 19:53:24"
sourceLastModified: "2026-05-10 01:52:52"
---

This guide gives you the public setup path for the MediaSFU Kotlin package and points to generated API references when you need exact signatures or types.

## Quick start

- Best for: Native Kotlin and Kotlin Multiplatform apps with Compose-first room surfaces
- Package/artifact: `com.mediasfu:mediasfu-sdk-android / com.mediasfu:mediasfu-sdk`
- Install: `implementation("com.mediasfu:mediasfu-sdk-android:1.0.1")`

---

## Start in 60 seconds

1. Add the Gradle dependency: `implementation("com.mediasfu:mediasfu-sdk-android:1.0.1")`
2. Pick backend mode: MediaSFU Cloud or self-hosted MediaSFU Open.
3. Follow the first setup section below for your framework.

### Before you continue

- Best for: Native Kotlin and Kotlin Multiplatform apps with Compose-first room surfaces
- For Dart/Flutter cross-platform apps, prefer `/sdks/flutter`.
- New to MediaSFU? Start at [/sdks](/sdks) to compare frameworks quickly.

## Copy/paste starter

Add the recommended Android Maven Central artifact, then mount the Compose room wrapper. Use the KMP artifact when sharing code across Kotlin targets.

```kotlin
repositories {
    mavenCentral()
}

dependencies {
    implementation("com.mediasfu:mediasfu-sdk-android:1.0.1")
    // For Kotlin Multiplatform projects:
    // implementation("com.mediasfu:mediasfu-sdk:1.0.1")
}
```

```kotlin
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.mediasfu.sdk.model.Credentials
import com.mediasfu.sdk.ui.mediasfu.MediasfuGeneric
import com.mediasfu.sdk.ui.mediasfu.MediasfuGenericOptions

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MediasfuGeneric(
                options = MediasfuGenericOptions(
                    credentials = Credentials("your_username", "your_api_key")
                )
            )
        }
    }
}
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
- Use the MediaSFU Kotlin entry on that page to open the staged Dokka/KDoc site for this package at `/api/kotlin/`.
- Use [Maven Central artifact metadata](https://central.sonatype.com/artifact/com.mediasfu/mediasfu-sdk) for release metadata and package availability.

Use the SDK guide for workflow guidance and the staged Dokka/KDoc site for exact package details, generated symbols, and signatures.

## Common setup mistakes

- Forgetting `mavenCentral()` or mixing the Android-only and Kotlin Multiplatform artifact coordinates.
- Mounting Compose room wrappers before activity/theme setup is ready.
- Testing camera/microphone behavior without Android runtime permissions and a physical device pass.
- Backend endpoint unreachable (Cloud credentials invalid or self-hosted server offline).
- Credentials committed directly in source files instead of secure environment configuration.

If setup fails, verify install → backend mode → credentials/local link in that order.

## Troubleshooting quick checks

| Check | Symptom | Quick fix |
| --- | --- | --- |
| Backend mode mismatch | Join/create flow fails early | Confirm Cloud credentials for cloud mode, or set `localLink` for self-hosted mode. |
| Gradle artifact not resolved | Build fails before app launch | Confirm `mavenCentral()` and the current `com.mediasfu:mediasfu-sdk-android` or `com.mediasfu:mediasfu-sdk` version. |
| Dependency mismatch | Build/install warnings | Reinstall dependencies and avoid force-install flags unless absolutely required. |

Use this table first before diving into deeper API sections.

## Production readiness checklist

- [ ] Backend mode decided (Cloud vs self-hosted) and documented.
- [ ] Credentials/keys sourced from secure environment config (not hard-coded).
- [ ] Android/KMP Gradle artifact version is pinned and Android permissions are validated on device.
- [ ] Happy-path join/create flow validated end-to-end.
- [ ] Release build passes cleanly in the target app environment.

Mark all items before release.

---

# MediaSFU Kotlin SDK

**Real-time video conferencing for Android & Kotlin Multiplatform** — drop-in solution with pre-built UI or full customization.

📖 **[Full Documentation →](#)** | 🌐 **[mediasfu.com](https://www.mediasfu.com/)**

---

## ⚡ Quick Start (2 Minutes)

### 1. Add Dependency

```kotlin
// build.gradle.kts (app level)
dependencies {
    // For Android-only projects (recommended):
    implementation("com.mediasfu:mediasfu-sdk-android:1.0.1")
    
    // For Kotlin Multiplatform projects:
    // implementation("com.mediasfu:mediasfu-sdk:1.0.1")
}
```

### 2. Use It

```kotlin
import com.mediasfu.sdk.ui.mediasfu.MediasfuGeneric
import com.mediasfu.sdk.ui.mediasfu.MediasfuGenericOptions
import com.mediasfu.sdk.model.Credentials

@Composable
fun App() {
    // Option 1: No credentials (testing/demo)
    MediasfuGeneric()
    
    // Option 2: With MediaSFU Cloud credentials
    // MediasfuGeneric(
    //     options = MediasfuGenericOptions(
    //         credentials = Credentials(apiUserName = "your_username", apiKey = "your_api_key")
    //     )
    // )
}
```

### 3. Run

```bash
./gradlew :androidApp:installDebug
```

**Done!** You have a full-featured video conferencing app with:
- ✅ Video & audio streaming
- ✅ Screen sharing
- ✅ Chat messaging
- ✅ Participant management
- ✅ Recording capabilities
- ✅ Breakout rooms & polls

---

## 📦 Installation

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    // For Android-only projects (recommended):
    implementation("com.mediasfu:mediasfu-sdk-android:1.0.1")
    
    // For Kotlin Multiplatform projects:
    // implementation("com.mediasfu:mediasfu-sdk:1.0.1")
}
```

### Android Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

---

## 🎯 Room Types

All room types are convenience wrappers around `MediasfuGeneric` with pre-configured event types:

| Type | Default Event Type | Use Case |
|------|-------------------|----------|
| `MediasfuGeneric` | `CONFERENCE` | General meetings |
| `MediasfuBroadcast` | `BROADCAST` | Live streaming |
| `MediasfuWebinar` | `WEBINAR` | Educational sessions |
| `MediasfuConference` | `CONFERENCE` | Business meetings |
| `MediasfuChat` | `CHAT` | Chat-focused |

```kotlin
import com.mediasfu.sdk.ui.mediasfu.*
import com.mediasfu.sdk.model.Credentials

val options = MediasfuGenericOptions(
    credentials = Credentials(apiUserName = "user", apiKey = "key")
)

// Pick the right one for your use case - all use the same options!
MediasfuWebinar(options = options)
MediasfuBroadcast(options = options)
MediasfuConference(options = options)
```

---

## 🧩 Components (Flutter/React-like API)

Import and use components directly — no boilerplate:

```kotlin
import com.mediasfu.sdk.ui.AudioGrid
import com.mediasfu.sdk.ui.FlexibleGrid
import com.mediasfu.sdk.ui.components.display.AudioGridOptions
import com.mediasfu.sdk.ui.components.display.FlexibleGridOptions

@Composable
fun CustomLayout(parameters: MediasfuParameters) {
    // Just like Flutter/React!
    AudioGrid(AudioGridOptions(
        participants = parameters.participants,
        columnsPerRow = 3
    ))
    
    FlexibleGrid(FlexibleGridOptions(
        parameters = parameters,
        columns = 2
    ))
}
```

### Available Components

| Component | Description |
|-----------|-------------|
| `AudioGrid` | Audio participant grid |
| `AudioCard` | Single audio participant |
| `FlexibleGrid` | Flexible video grid |
| `FlexibleVideo` | Main video display |
| `MiniCard` | Compact participant card |
| `Pagination` | Page controls |
| `AlertComponent` | Alert messages |
| `MainAspectComponent` | Layout container |

---

## 🎨 Customization Modes

### Mode 1: Default UI (Easiest)

```kotlin
@Composable
fun App() {
    MediasfuGeneric(options = options)
}
```

### Mode 2: Custom UI with MediaSFU Backend

```kotlin
@Composable
fun App() {
    var parameters by remember { mutableStateOf<MediasfuParameters?>(null) }
    
    // Hidden MediaSFU backend
    MediasfuGeneric(
        options = options.copy(returnUI = false),
        onParametersUpdate = { parameters = it }
    )
    
    // Your custom UI
    parameters?.let { params ->
        Column {
            Text("Room: ${params.roomName}")
            Button(onClick = { params.clickVideo(params) }) {
                Text(if (params.videoAlreadyOn) "Stop Video" else "Start Video")
            }
        }
    }
}
```

### Mode 3: Replace Specific Components

```kotlin
@Composable
fun CustomMainScreen(parameters: MediasfuParameters) {
    Column {
        FlexibleVideo(FlexibleVideoOptions(parameters = parameters))
        FlexibleGrid(FlexibleGridOptions(parameters = parameters))
    }
}

MediasfuGeneric(
    options = options,
    customComponent = { CustomMainScreen(it) }
)
```

---

## 🔧 Key Methods

```kotlin
// Media controls
parameters.clickVideo(parameters)       // Toggle video
parameters.clickAudio(parameters)       // Toggle audio
parameters.clickScreenShare(parameters) // Toggle screen share

// State
parameters.videoAlreadyOn              // Boolean
parameters.audioAlreadyOn              // Boolean
parameters.participants                // List<Participant>

// Modals
parameters.updateIsParticipantsModalVisible(true)
parameters.updateIsMessagesModalVisible(true)
```

---

## 🏠 Self-Hosting

No API key needed for self-hosting. Use [MediaSFU Open](https://github.com/MediaSFU/MediaSFUOpen):

```kotlin
import com.mediasfu.sdk.ui.mediasfu.MediasfuGeneric
import com.mediasfu.sdk.ui.mediasfu.MediasfuGenericOptions

MediasfuGeneric(
    options = MediasfuGenericOptions(
        connectMediaSFU = false,
        localLink = "http://your-server:3000"
    )
)
```

---

## 📚 More Resources

- **[Full Documentation](#)** — Complete API reference, all components, methods
- **[mediasfu.com](https://www.mediasfu.com/)** — Official docs
- **[Community Forum](https://www.mediasfu.com/forums)** — Get help
- **[GitHub](https://github.com/MediaSFU)** — Source code

---

## 📄 License

MIT © [MediaSFU](https://mediasfu.com)
