# Daakia Mobile App Rebranding Guide

Complete configuration guide for rebranding Mattermost Mobile to Daakia.

## Core Configuration Files

### 1. App Configuration (config.json)
**Location**: `/assets/base/config.json`

**What**: Main app settings (URLs, features, telemetry)

**Status**: ✅ Already customized - URLs, auth schemes

### 2. Package Configuration (package.json)
**Location**: `/package.json`

**What**: App metadata, dependencies, scripts

**Need to change**:
- `name`: "mattermost-mobile" → "daakia-mobile"
- `description`: Update to your app description
- `repository`: Your git repository
- `author`: "Mattermost, Inc." → "Daakia"

### 3. App Identity (app.json)
**Location**: `/app.json`

**What**: React Native app name and display name

**Need to change**:
- `name`: "Mattermost" → "Daakia"
- `displayName`: "Mattermost" → "Daakia"

## Android Configuration

### 4. Android Manifest (AndroidManifest.xml)
**Location**: `/android/app/src/main/AndroidManifest.xml`

**Status**: ✅ Already customized - Deep linking schemes

**Need to check**: App permissions, package name

### 5. Android Build (build.gradle)
**Location**: `/android/app/build.gradle`

**Need to change**:
- `namespace`: "com.mattermost.rnbeta" → "com.daakia.app"
- `applicationId`: "com.mattermost.rnbeta" → "com.daakia.app"
- `versionName`: Update version
- `versionCode`: Update build number

### 6. Android Strings & Resources
**Location**: `/android/app/src/main/res/`

**What**: App name, icons, splash screens

**Need to change**: App name in strings.xml, replace icons

## iOS Configuration

### 7. iOS Info.plist
**Location**: `/ios/Mattermost/Info.plist`

**Status**: ✅ Already customized - Deep linking schemes

**Need to change**:
- `CFBundleDisplayName`: "Mattermost Beta" → "Daakia"
- `CFBundleIdentifier`: "com.mattermost.rnbeta" → "com.daakia.app"
- `AppGroupIdentifier`: Update group ID
- `CFBundleShortVersionString`: Update version

### 8. iOS Project Configuration
**Location**: `/ios/Mattermost.xcodeproj/`

**What**: Xcode project settings, bundle IDs, certificates

**Need to change**: Bundle identifiers, team IDs, app icons

## Branding & Assets

### 9. App Icons & Images
**Location**: 
- `/android/app/src/main/res/mipmap-*/` (Android)
- `/ios/Mattermost/Images.xcassets/` (iOS)

**What**: App icons, splash screens, logos

**Need to replace**: All Mattermost logos with Daakia branding

### 10. Fonts & Assets
**Location**: `/assets/fonts/`, `/assets/base/images/`

**What**: Custom fonts, images, sounds

**Optional**: Replace with your brand assets

## Build & Deployment

### 11. Fastlane Configuration
**Location**: `/fastlane/`

**What**: Automated build and deployment scripts

**Need to update**: App Store Connect credentials, certificates

### 12. Environment Files
**Location**: `/fastlane/.env.*`

**What**: Build environment variables

**Need to update**: Bundle IDs, certificates, API keys

## Development Tools

### 13. ESLint & TypeScript
**Location**: `/eslint.config.mjs`, `/tsconfig.json`

**What**: Code quality and type checking

**Usually keep**: As-is unless you have specific requirements

### 14. Metro & Babel
**Location**: `/metro.config.js`, `/babel.config.js`

**What**: JavaScript bundling and transformation

**Usually keep**: As-is

## Key Changes Needed for Daakia

### High Priority:
1. ✅ `config.json` - Done
2. ✅ Deep linking schemes - Done  
3. 🔄 `package.json` - Update metadata
4. 🔄 `app.json` - Update app names
5. 🔄 Android `build.gradle` - Update package names
6. 🔄 iOS `Info.plist` - Update bundle IDs
7. 🔄 Replace all app icons and branding assets

### Medium Priority:
8. Update Fastlane configuration for your certificates
9. Replace Mattermost branding in images/assets
10. Update app store metadata

## Implementation Checklist

- [ ] Update package.json metadata
- [ ] Update app.json names
- [ ] Change Android package names in build.gradle
- [ ] Update iOS bundle IDs in Info.plist
- [ ] Replace app icons (Android & iOS)
- [ ] Update splash screens
- [ ] Replace in-app branding images
- [ ] Update Fastlane certificates
- [ ] Test deep linking with new schemes
- [ ] Verify OAuth authentication flows

This gives you a complete roadmap for rebranding the Mattermost mobile app to Daakia!