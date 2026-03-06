# GeoNotify

Simple geofencing reminder app built with Expo/React Native.

## Overview
The app allows you to specify coordinates (either by input or long-pressing the map). It runs in the background and sends a local notification when your device comes within ~100m of a saved location. Useful for reminding you about nearby places (grocery stores, etc.).

## Features
- Map view with current location
- Add markers by long press or manual entry
- Background location tracking and geofencing
- Local notifications when entering radius

## Setup & Build
1. **Install dependencies**

   ```bash
   cd geonotify
   npm install
   # or yarn install
   ```

2. **Run during development**

   ```bash
   npm run start
   # then press 'a' to launch Android emulator or scan QR with Expo Go
   ```

3. **Generate APK**
   - Using classic Expo build (requires Expo account):
     ```bash
     expo login
     expo build:android -t apk
     ```
     The resulting `.apk` will be available once the build completes.

   - Or use EAS Build for newer tooling:
     ```bash
     npm install -g eas-cli
     eas login
     eas build --platform android --profile release
     eas build:status
     ```

   The build service will produce an installable APK file you can download and sideload to your Android device.

4. **Configuration**
   - `app.json` already requests necessary permissions including background location and notifications.
   - For production you may need to configure Google Maps API key for `react-native-maps`.

5. **Running on a physical device**
   - Install the generated APK via USB or ADB:
     ```bash
     adb install path/to/your.apk
     ```

   - Grant location permissions manually if prompted.

## Notes
- Background location on Android might require additional settings (battery optimization disable, etc.).
- Keep the app running as a foreground service to guarantee continuous updates.
- The threshold is currently hard-coded to 100m but can be customized in `App.js`.

Enjoy your reminders!"