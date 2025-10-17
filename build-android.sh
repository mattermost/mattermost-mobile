#!/bin/bash

# Build Android APK without Android Studio
echo "Building Android APK..."

# Clean previous builds
npx react-native clean

# Generate release APK
cd android
./gradlew assembleRelease

echo "APK built successfully!"
echo "Location: android/app/build/outputs/apk/release/app-release.apk"