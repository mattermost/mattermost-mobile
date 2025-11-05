# Package Identifiers & Names for Daakia Rebranding

This document lists ALL package names, bundle identifiers, and service identifiers that need to be changed when rebranding from Mattermost to Daakia.

---

## ✅ Already Changed

### 1. NPM Package Name
**File**: `package.json`
- ✅ `name`: `"daakia-chat"` (line 2)
- ✅ `author`: `"Daakia, Inc."` (line 6)

### 2. App Display Name
**File**: `app.json`
- ✅ `name`: `"Daakia Chat"` (line 2)
- ✅ `displayName`: `"Daakia Chat"` (line 3)

### 3. iOS Display Name
**File**: `ios/Mattermost/Info.plist`
- ✅ `CFBundleDisplayName`: `"Daakia Chat"` (line 12)

### 4. Deep Link URLs
**Files**: 
- `android/app/src/main/AndroidManifest.xml` (lines 74, 80)
- `ios/Mattermost/Info.plist` (lines 34-35)
- ✅ URL Schemes: `daakia`, `daakia-dev`

---

## ❌ NEEDS TO BE CHANGED

### 🤖 ANDROID

#### 1. **Main Application Package** (CRITICAL)
**File**: `android/app/build.gradle`
- ❌ Line 107: `namespace "com.mattermost.rnbeta"`
- ❌ Line 115: `applicationId "com.mattermost.rnbeta"`

**Recommended Change**:
```gradle
namespace "com.daakia.chat"
applicationId "com.daakia.chat"
```

#### 2. **Android Manifest Package References**
**File**: `android/app/src/main/AndroidManifest.xml`
- ❌ Line 96: `android:name="com.mattermost.rnshare.ShareActivity"`
- ❌ Line 100: `android:taskAffinity="com.mattermost.share"`

**Recommended Change**:
```xml
android:name="com.daakia.rnshare.ShareActivity"
android:taskAffinity="com.daakia.share"
```

#### 3. **Firebase Push Notifications** (CRITICAL)
**File**: `android/app/google-services.json`
- ❌ Line 13: `"package_name": "com.mattermost.react.native"`
- ❌ Line 44: `"package_name": "com.mattermost.rnbeta"`
- ❌ Line 75: `"package_name": "com.mattermost.rn"`

**Action Required**: 
1. Create NEW Firebase project for Daakia
2. Register app with package name: `com.daakia.chat`
3. Download new `google-services.json`
4. Replace the existing file

**Current Firebase Project**: `api-7231322553409637977-752355`

#### 4. **Android Signing Keys** (IMPORTANT)
**File**: `android/app/build.gradle`
- ❌ Lines 126-131: `MATTERMOST_RELEASE_STORE_FILE`, `MATTERMOST_RELEASE_PASSWORD`, etc.

**Recommended Change**:
```gradle
signingConfigs {
    release {
        if (project.hasProperty('DAAKIA_RELEASE_STORE_FILE')) {
            storeFile file(DAAKIA_RELEASE_STORE_FILE)
            storePassword DAAKIA_RELEASE_PASSWORD
            keyAlias DAAKIA_RELEASE_KEY_ALIAS
            keyPassword DAAKIA_RELEASE_PASSWORD
        }
    }
}
```

#### 5. **Java/Kotlin Package Structure** (CRITICAL)
**Current Structure**:
```
android/app/src/main/java/com/mattermost/
├── rnbeta/
│   ├── MainApplication.kt
│   ├── MainActivity.kt
│   ├── CustomPushNotification.kt
│   ├── NotificationDismissService.java
│   ├── NotificationReplyBroadcastReceiver.java
│   └── ReceiptDelivery.java
└── helpers/
    ├── push_notification/
    │   ├── User.kt
    │   ├── Thread.kt
    │   ├── Team.kt
    │   ├── Post.kt
    │   ├── General.kt
    │   ├── Channel.kt
    │   └── Category.kt
    ├── database_extension/
    │   ├── [Multiple files]
    └── [Other helper files]
```

**Action Required**:
1. Rename directory: `com/mattermost/` → `com/daakia/`
2. Update package declarations in ALL Java/Kotlin files (39 files total)
3. Update imports that reference `com.mattermost.*`

**Files to Update** (39 files):
- `android/app/src/main/java/com/mattermost/rnbeta/*.kt` (6 files)
- `android/app/src/main/java/com/mattermost/rnbeta/*.java` (3 files)
- `android/app/src/main/java/com/mattermost/helpers/**/*.kt` (25 files)
- `android/app/src/main/java/com/mattermost/helpers/**/*.java` (4 files)
- `android/app/src/androidTest/java/com/mattermost/rnbeta/DetoxTest.java` (1 file)

---

### 🍎 iOS

#### 1. **Main App Bundle Identifier** (CRITICAL)
**File**: `ios/Mattermost/Info.plist`
- ❌ Line 6: `<string>group.com.mattermost.rnbeta</string>` (App Group)
- ❌ Line 16: `<string>com.mattermost.rnbeta</string>` (Bundle ID)

**File**: `ios/Mattermost.xcodeproj/project.pbxproj`
- ❌ Line 2116: `PRODUCT_BUNDLE_IDENTIFIER = com.mattermost.rnbeta;`
- ❌ Line 2155: `PRODUCT_BUNDLE_IDENTIFIER = com.mattermost.rnbeta;`

**Recommended Change**:
```
Bundle Identifier: com.daakia.chat
App Group: group.com.daakia.chat
```

#### 2. **NotificationService Extension** (CRITICAL)
**File**: `ios/NotificationService/Info.plist`
- ❌ Line 6: `<string>group.com.mattermost.rnbeta</string>`

**File**: `ios/Mattermost.xcodeproj/project.pbxproj`
- ❌ Line 2205: `PRODUCT_BUNDLE_IDENTIFIER = com.mattermost.rnbeta.NotificationService;`
- ❌ Line 2251: `PRODUCT_BUNDLE_IDENTIFIER = com.mattermost.rnbeta.NotificationService;`

**Recommended Change**:
```
Bundle Identifier: com.daakia.chat.NotificationService
```

#### 3. **Share Extension (MattermostShare)** (CRITICAL)
**File**: `ios/MattermostShare/Info.plist`
- ❌ Line 6: `<string>group.com.mattermost.rnbeta</string>`
- ❌ Line 10: `<string>Mattermost</string>` (Display Name)
- ❌ Line 14: `<string>com.mattermost.rnbeta.MattermostShare</string>`
- ❌ Line 81: Copyright notice mentions "Mattermost, Inc."

**File**: `ios/Mattermost.xcodeproj/project.pbxproj`
- ❌ Line 2300: `PRODUCT_BUNDLE_IDENTIFIER = com.mattermost.rnbeta.MattermostShare;`
- ❌ Line 2350: `PRODUCT_BUNDLE_IDENTIFIER = com.mattermost.rnbeta.MattermostShare;`

**Recommended Change**:
```
Bundle Identifier: com.daakia.chat.DaakiaShare
Display Name: Daakia Chat
Copyright: Copyright (c) 2025-present Daakia, Inc.
```

#### 4. **App Group Identifier** (CRITICAL)
**Files**:
- `ios/Mattermost/Info.plist` (line 6)
- `ios/Mattermost/Mattermost.entitlements` (line 25)
- `ios/MattermostShare/Info.plist` (line 6)
- `ios/MattermostShare/MattermostShare.entitlements` (line 7)
- `ios/NotificationService/Info.plist` (line 6)

**Current**: `group.com.mattermost.rnbeta`
**Change to**: `group.com.daakia.chat`

#### 5. **Keychain Access Group** (CRITICAL)
**File**: `ios/Mattermost/Mattermost.entitlements`
- ❌ Line 29: `<string>$(AppIdentifierPrefix)com.mattermost.rnbeta</string>`

**Change to**:
```xml
<string>$(AppIdentifierPrefix)com.daakia.chat</string>
```

#### 6. **iCloud Container Identifiers**
**File**: `ios/Mattermost/Mattermost.entitlements`
- ❌ Lines 9, 17: `<string>iCloud.$(CFBundleIdentifier)</string>`

These will automatically update when you change `CFBundleIdentifier`, so ensure the main bundle ID is correct first.

#### 7. **iOS Project/Workspace Rename**
**Current Structure**:
```
ios/
├── Mattermost/
├── Mattermost.xcodeproj/
├── Mattermost.xcworkspace/
├── MattermostShare/
└── MattermostTests/
```

**Recommended Rename** (Optional but cleaner):
- `Mattermost/` → `Daakia/`
- `Mattermost.xcodeproj/` → `Daakia.xcodeproj/`
- `Mattermost.xcworkspace/` → `Daakia.xcworkspace/`
- `MattermostShare/` → `DaakiaShare/`
- `MattermostTests/` → `DaakiaTests/`

**Note**: This requires updating Xcode project references and is complex. Consider doing this in a separate phase.

---

### 📦 NATIVE LIBRARIES

These custom native modules also use Mattermost package names:

#### 1. **@mattermost/rnshare**
**File**: `libraries/@mattermost/rnshare/android/src/main/AndroidManifest.xml`
- ❌ Line 2: `package="com.mattermost.rnshare"`

**Files with package declarations** (9 files):
- `libraries/@mattermost/rnshare/android/src/main/java/com/mattermost/rnshare/*.kt`

**Recommended Change**: `com.daakia.rnshare`

#### 2. **@mattermost/rnutils**
**File**: `libraries/@mattermost/rnutils/android/src/main/AndroidManifest.xml`
- Package: `com.mattermost.rnutils`

**Files with package declarations** (8 files):
- `libraries/@mattermost/rnutils/android/src/main/java/com/mattermost/rnutils/**/*.kt`

**Recommended Change**: `com.daakia.rnutils`

#### 3. **@mattermost/secure-pdf-viewer**
**File**: `libraries/@mattermost/secure-pdf-viewer/android/src/main/AndroidManifest.xml`
- Package: `com.mattermost.securepdfviewer`

**Files with package declarations** (36 files):
- `libraries/@mattermost/secure-pdf-viewer/android/src/main/java/com/mattermost/securepdfviewer/**/*.kt`

**Recommended Change**: `com.daakia.securepdfviewer`

#### 4. **@mattermost/hardware-keyboard**
**File**: `libraries/@mattermost/hardware-keyboard/android/src/main/AndroidManifest.xml`
- Package: `com.mattermost.hardware.keyboard`

**Files with package declarations** (4 files):
- `libraries/@mattermost/hardware-keyboard/android/src/main/java/com/mattermost/hardware/keyboard/*.kt`

**Recommended Change**: `com.daakia.hardware.keyboard`

---

## 🔔 PUSH NOTIFICATIONS

### Android (Firebase Cloud Messaging)
**Current Setup**: Uses Firebase project with Mattermost package names

**Required Actions**:
1. Create new Firebase project: "Daakia Chat"
2. Add Android app with package: `com.daakia.chat`
3. Generate new `google-services.json`
4. Replace file at: `android/app/google-services.json`
5. Update server-side push notification service to send to new FCM credentials

### iOS (Apple Push Notification Service)
**Current Setup**: Uses bundle ID `com.mattermost.rnbeta`

**Required Actions**:
1. Register new App ID in Apple Developer Portal: `com.daakia.chat`
2. Create new push notification certificates for:
   - Main app: `com.daakia.chat`
   - NotificationService: `com.daakia.chat.NotificationService`
3. Update provisioning profiles
4. Configure push notifications in Xcode project
5. Update server-side push notification service with new certificates

---

## 📝 SUMMARY OF CHANGES NEEDED

### Critical Changes (Must Change for App to Work):
1. ✅ **Android**: Change `applicationId` and `namespace` in `build.gradle`
2. ✅ **Android**: Rename Java/Kotlin package structure `com.mattermost.*` → `com.daakia.*`
3. ✅ **Android**: Update package declarations in 39+ Java/Kotlin files
4. ✅ **Android**: Create new Firebase project and replace `google-services.json`
5. ✅ **iOS**: Update all bundle identifiers in Xcode project
6. ✅ **iOS**: Update App Group identifiers in all entitlements files
7. ✅ **iOS**: Update Keychain access groups
8. ✅ **iOS**: Register new App IDs in Apple Developer Portal
9. ✅ **Native Libraries**: Update package names in 4 custom libraries (60+ files)

### Important Changes (Should Change):
1. Update signing config variable names (`MATTERMOST_*` → `DAAKIA_*`)
2. Update copyright notices
3. Consider renaming iOS folders/projects

### Already Complete:
1. ✅ NPM package name
2. ✅ App display names
3. ✅ Deep link URL schemes

---

## 🚀 RECOMMENDED MIGRATION ORDER

### Phase 1: Android Package Rename
1. Rename Android package structure
2. Update all package declarations
3. Update `build.gradle` identifiers
4. Update `AndroidManifest.xml`
5. Update native libraries

### Phase 2: iOS Bundle Identifiers
1. Update bundle IDs in Xcode project
2. Update Info.plist files
3. Update entitlements files
4. Register new App IDs

### Phase 3: Push Notifications
1. Create new Firebase project
2. Generate new `google-services.json`
3. Register iOS App IDs
4. Create push certificates
5. Update server configuration

### Phase 4: Testing
1. Test app installation
2. Test push notifications
3. Test share extension
4. Test deep links
5. Test keychain access
6. Test app groups

---

## ⚠️ WARNINGS

1. **Existing Users**: Changing package name = NEW APP. Users will need to reinstall.
2. **Data Loss**: Users will lose local data unless you implement migration.
3. **Push Notifications**: Old push tokens will be invalid.
4. **App Store**: This will be treated as a completely new app.
5. **Signing**: You'll need NEW signing keys for production.
6. **Deep Links**: Old `mattermost://` links will break (already changed to `daakia://`).

---

## 📊 FILE CHANGE STATISTICS

- **Android Java/Kotlin Files**: 39 files in main app
- **Native Library Files**: 60 files across 4 libraries
- **iOS Configuration Files**: 7 files (.plist, .entitlements)
- **Xcode Project Files**: 1 file (project.pbxproj)
- **Build Configuration**: 2 files (build.gradle, google-services.json)
- **Total Estimated Files**: ~110+ files to modify

---

## 🔍 SEARCH COMMANDS TO FIND ALL REFERENCES

```bash
# Find all "mattermost" references (case-insensitive)
grep -r -i "mattermost" android/ ios/ libraries/ --exclude-dir=build --exclude-dir=Pods

# Find all package declarations
grep -r "package com.mattermost" android/ libraries/

# Find all bundle identifiers
grep -r "com.mattermost.rnbeta" ios/

# Find all app group references
grep -r "group.com.mattermost" ios/
```

---

## 📚 NEXT STEPS

1. **Backup Everything**: Commit all changes to git before starting
2. **Create Branch**: `git checkout -b refactor/package-rename`
3. **Follow Migration Order**: Complete Phase 1-4 systematically
4. **Test Thoroughly**: Test on both platforms
5. **Update Documentation**: Update any docs referencing old package names
6. **Update CI/CD**: Update build scripts with new package names
7. **Update Server**: Configure server to recognize new app identifiers

---

**Last Updated**: October 17, 2025
**Status**: Ready for Implementation
**Estimated Time**: 8-12 hours for complete migration

