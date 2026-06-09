# Tracker (Flutter)

Background GPS tracker using the free, open-source
[`background_locator_2`](https://pub.dev/packages/background_locator_2) plugin.
Works on Android and iOS.

## Setup

1. Install Flutter (3.3+) and run `flutter create .` **once** inside this
   folder to generate the `android/` and `ios/` native projects (the Dart
   sources in `lib/` and `pubspec.yaml` are already provided — keep them).
2. `flutter pub get`
3. Edit `lib/config.dart`:
   - `backendUrl` — your backend (use `http://10.0.2.2:4000` for the Android
     emulator, your LAN IP for a physical device, or your deployed HTTPS URL).
   - `deviceToken` — paste the device JWT the backend prints on startup.
4. Apply the native permissions below, then `flutter run`.

## Required native configuration

Background location needs platform-specific setup. The plugin's
[README](https://pub.dev/packages/background_locator_2) is authoritative; the
essentials:

### Android — `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>

<application ...>
  <!-- Registered by the plugin; declares the foreground service. -->
  <service
    android:name="rekab.app.background_locator.LocatorService"
    android:foregroundServiceType="location"
    android:enabled="true"
    android:exported="true"
    android:permission="android.permission.BIND_JOB_SERVICE"/>
</application>
```

Set `minSdkVersion 21` (or higher) in `android/app/build.gradle`.

### iOS — `ios/Runner/Info.plist`

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Used to share your location with the monitor.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Used to keep sharing your location in the background.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
```

## How it works

- `lib/main.dart` requests permissions and starts/stops the background service.
- `lib/location_callback.dart` runs in a **separate isolate** on every fix and
  POSTs the point to the backend. If the network is down it buffers points in
  `shared_preferences` and flushes them (as a batch) on the next successful
  send — so no points are lost offline.

## Battery & accuracy

Tune `distanceFilterMeters` in `lib/config.dart`. Larger values report less
often and save battery; smaller values give a finer track.

## Privacy

Background location is sensitive. To pass App Store / Play review you must show
a clear in-app disclosure of what is collected and why, and link a privacy
policy. The Android foreground-service notification (configured in `main.dart`)
keeps the user aware that tracking is active.
