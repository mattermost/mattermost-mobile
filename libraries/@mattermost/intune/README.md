# @mattermost/intune

Microsoft Intune MAM (Mobile Application Management) integration for Mattermost Mobile.

## Overview

This React Native library provides iOS integration with:
- **MSAL (Microsoft Authentication Library)** for Azure AD authentication
- **IntuneMAM SDK** for mobile app management and policy enforcement

## Features

- ✅ **MSAL Authentication**: Silent and interactive token acquisition with offline_access
- ✅ **Intune Enrollment**: Register and enroll accounts with Intune MAM SDK
- ✅ **Multi-Server Support**: Handles both MAM-controlled and uncontrolled servers
- ✅ **Shared Azure AD Account**: Same Azure AD account can be used across multiple servers
- ✅ **ServerUrl-Based API**: Simplified JavaScript API using serverUrl instead of OID
- ✅ **Keychain Storage**: Secure per-server enrollment storage with caching
- ✅ **Identity Switching**: Automatic identity switching when changing servers
- ✅ **Selective Wipe**: Server-specific data deletion via Intune policy
- ✅ **Event System**: Type-safe events for enrollment, policy changes, and wipe requests
- ✅ **Clean Architecture**: Organized into Protocols, Managers, Delegates, Extensions
- ✅ **Gekidou Integration**: TurboLog logging (no PII)
- ✅ **Build-time Configuration**: Via Fastlane environment variables

## Prerequisites

### Azure Setup

1. **Azure App Registration**
   - Create app registration in Azure Portal
   - Note the **Application (client) ID**
   - Configure redirect URI: `msauth.<BUNDLE_ID>://auth`
   - Add API permissions: `User.Read`, `offline_access`

2. **Intune License**
   - Active Intune license for test tenant
   - App protection policies configured

### Development Environment

- Xcode 13.0+
- CocoaPods 1.16.1+
- Git LFS installed and configured
- Node.js (version per main package.json)

## Installation

### Step 1: Install Git LFS

```bash
# Install Git LFS (if not already installed)
brew install git-lfs
git lfs install
```

### Step 2: Download IntuneMAM SDK

1. Download IntuneMAM SDK v21.2.0 from:
   https://github.com/microsoftconnect/ms-intune-app-sdk-ios/releases/tag/21.2.0

2. Extract and copy XCFrameworks:
   ```bash
   # Copy frameworks to library
   cp -r path/to/extracted/IntuneMAMSwift.xcframework libraries/@mattermost/intune/ios/Frameworks/
   cp -r path/to/extracted/IntuneMAMSwiftStub.xcframework libraries/@mattermost/intune/ios/Frameworks/
   ```

3. Track with Git LFS:
   ```bash
   cd libraries/@mattermost/intune/ios/Frameworks
   git lfs track "*.xcframework/**"
   git add .gitattributes
   git add *.xcframework
   git commit -m "Add IntuneMAM SDK v21.2.0 XCFrameworks"
   ```

### Step 3: Configure Fastlane Environment Variables

Create or update your Fastlane `.env` file:

```bash
# Intune MAM Configuration
export INTUNE_ENABLED=true
export INTUNE_CLIENT_ID="your-azure-client-id"
export INTUNE_TENANT_ID="organizations"  # or specific tenant ID
export INTUNE_REDIRECT_URI_SCHEME="msauth"
```

### Step 4: Install Dependencies

```bash
# Install npm dependencies
npm install

# Install iOS pods
cd ios
pod install
cd ..
```

### Step 5: Build the App

```bash
# Run Fastlane configure to generate config.json
cd fastlane
fastlane configure
cd ..

# Build and run
npm run ios
```

## Usage

### Import

```typescript
import Intune from '@mattermost/intune';
import type {
  MSALIdentity,
  IntunePolicy,
  IntuneEnrollmentChangedEvent,
  IntunePolicyChangedEvent,
  IntuneWipeRequestedEvent,
  IntuneAuthRequiredEvent,
  IntuneConditionalLaunchBlockedEvent,
  IntuneIdentitySwitchRequiredEvent,
} from '@mattermost/intune';
```

### Enrollment Flow

```typescript
// After SSO success with Entra ID
async function enrollWithIntune(serverUrl: string, loginHint: string) {
  try {
    // Acquires MSAL token and enrolls with Intune
    const identity: MSALIdentity = await Intune.attachAndEnroll(serverUrl, loginHint);

    console.log('Enrollment succeeded:', {
      upn: identity.upn,
      tid: identity.tid,
      oid: identity.oid
    });

    // Store enrollment status in database
    await updateServerIntuneStatus(serverUrl, identity.tid);
  } catch (error) {
    console.error('Enrollment failed (non-blocking):', error);
    // App continues - enrollment failure is not fatal
  }
}
```

### Identity Switching

```typescript
// Switch identity when changing servers
async function switchServer(newServerUrl: string) {
  try {
    await Intune.setCurrentIdentity(newServerUrl);
    console.log('Identity switched to:', newServerUrl);
  } catch (error) {
    console.error('Identity switch failed:', error);
  }
}

// Clear identity (switch to unmanaged)
async function clearIdentity() {
  await Intune.setCurrentIdentity(null);
}
```

### Check Server Status

```typescript
// Check if a server is managed by Intune
const isManaged = await Intune.isManagedServer(serverUrl);

// Get currently enrolled account (returns OID)
const enrolledOid = await Intune.getEnrolledAccount();
```

### Policy Queries

```typescript
// Get full policy for a server
const policy: IntunePolicy | null = await Intune.getPolicy(serverUrl);
if (policy) {
  console.log('Policy received:', {
    isScreenCaptureAllowed: policy.isScreenCaptureAllowed,
    allowedSaveLocations: policy.allowedSaveLocations,
    // ... 12 more fields
  });
}

// Check specific policies
const canScreenshot = await Intune.isScreenCaptureAllowed(serverUrl);
const canSaveToPhotos = await Intune.canSaveToLocation(0, serverUrl); // 0 = Photos
```

### Unenrollment

```typescript
async function unenrollServer(serverUrl: string, oid: string, doWipe: boolean = false) {
  try {
    // Unenroll from Intune
    await Intune.deregisterAndUnenroll(serverUrl, oid, doWipe);

    // Clear enrollment status from database
    await clearServerIntuneStatus(serverUrl);
  } catch (error) {
    console.error('Unenrollment failed:', error);
  }
}
```

### Event Listeners

The library provides type-safe event listener methods:

```typescript
// Enrollment changed
const enrollmentSubscription = Intune.onIntuneEnrollmentChanged((event) => {
  console.log('Enrollment changed:', {
    enrolled: event.enrolled,
    reason: event.reason,
    oid: event.oid,
    serverUrls: event.serverUrls // All servers using this OID
  });
});

// Policy changed
const policySubscription = Intune.onIntunePolicyChanged((event) => {
  console.log('Policy changed:', {
    oid: event.oid,
    changed: event.changed,
    removed: event.removed,
    policy: event.policy, // Full policy object when changed
    serverUrls: event.serverUrls
  });
});

// Wipe requested
const wipeSubscription = Intune.onIntuneWipeRequested((event) => {
  console.log('Wipe requested for:', event.serverUrls);

  // Delete all data for affected servers
  event.serverUrls.forEach(async (serverUrl) => {
    await deleteServerData(serverUrl);
    await Intune.deregisterAndUnenroll(serverUrl, event.oid, true);
  });
});

// Auth required (token refresh needed)
const authSubscription = Intune.onIntuneAuthRequired((event) => {
  console.log('Auth required for OID:', event.oid);
  // Show re-authentication UI
});

// Identity switch required
const identitySwitchSubscription = Intune.onIntuneIdentitySwitchRequired((event) => {
  console.log('Identity switch required:', event.reason);
  // Reasons: 'open_url', 'cancel_conditional_launch', 'document_import', 'unknown'
});

// Conditional launch blocked
const blockedSubscription = Intune.onIntuneConditionalLaunchBlocked((event) => {
  console.log('Conditional launch blocked:', event.reason);
  // Show blocked state UI for affected servers
});

// Don't forget to remove listeners when component unmounts
enrollmentSubscription.remove();
policySubscription.remove();
wipeSubscription.remove();
authSubscription.remove();
identitySwitchSubscription.remove();
blockedSubscription.remove();
```

**Benefits of Event Helper Methods:**
- ✅ **Type-safe** - Event parameters are strongly typed
- ✅ **Autocomplete** - IDE provides intellisense for event properties
- ✅ **No typos** - Can't misspell event names
- ✅ **Cleaner** - No need to create `NativeEventEmitter` manually

## API Reference

### Core Methods

#### `attachAndEnroll(serverUrl: string, loginHint: string): Promise<MSALIdentity>`
Acquires MSAL token (silent first, interactive fallback) and enrolls with Intune MAM.

**Parameters:**
- `serverUrl` - Mattermost server URL
- `loginHint` - User email for MSAL authentication

**Returns:** `{upn, tid, oid}`

**Errors:**
- MSAL errors (configuration, network, etc.)
- Intune enrollment errors (logged but non-blocking)

#### `getEnrolledAccount(): Promise<string | null>`
Get the OID of the currently enrolled account from Intune SDK.

**Returns:** OID string or `null` if not enrolled

#### `isManagedServer(serverUrl: string): Promise<boolean>`
Check if a server is managed by Intune.

**Parameters:**
- `serverUrl` - Server URL to check

**Returns:** `true` if server is enrolled and managed by Intune

#### `deregisterAndUnenroll(serverUrl: string, oid: string, doWipe: boolean): Promise<void>`
Unenroll from Intune for a specific server.

**Parameters:**
- `serverUrl` - Server URL to unenroll
- `oid` - Azure AD object ID
- `doWipe` - Whether to trigger selective wipe (confirm wipe to SDK)

**Note:** Smart unenrollment - only calls SDK unenroll when last server is removed

#### `setCurrentIdentity(serverUrl: string | null): Promise<void>`
Switch the current identity for policy enforcement.

**Parameters:**
- `serverUrl` - Server URL to switch to, or `null` for unmanaged

**Note:** Should be called when user switches servers

### Policy Methods

#### `getPolicy(serverUrl: string): Promise<IntunePolicy | null>`
Get full Intune policy for a server.

**Returns:** Policy object with 14 fields, or `null` if not managed

**Policy Fields:**
- `isPINRequired: boolean`
- `isContactSyncAllowed: boolean`
- `isWidgetContentSyncAllowed: boolean`
- `isSpotlightIndexingAllowed: boolean`
- `areSiriIntentsAllowed: boolean`
- `areAppIntentsAllowed: boolean`
- `isAppSharingAllowed: boolean`
- `shouldFileProviderEncryptFiles: boolean`
- `isManagedBrowserRequired: boolean`
- `isFileEncryptionRequired: boolean`
- `isScreenCaptureAllowed: boolean`
- `notificationPolicy: number` (0=allow, 1=blockOrgData, 2=block)
- `allowedSaveLocations: number` (bitmask)
- `allowedOpenLocations: number` (bitmask)

#### `isScreenCaptureAllowed(serverUrl: string): Promise<boolean>`
Check if screen capture is allowed for a server.

**Returns:** `true` if allowed, `false` if blocked by policy

#### `canSaveToLocation(location: number, serverUrl: string): Promise<boolean>`
Check if saving to a specific location is allowed.

**Parameters:**
- `location` - Location enum value (0=Photos, 1=Local, etc.)
- `serverUrl` - Server URL to check

**Returns:** `true` if allowed by policy

### Event Listener Methods

The library provides type-safe helper methods for event listeners:

#### `onIntuneEnrollmentChanged(listener: (event: IntuneEnrollmentChangedEvent) => void): EmitterSubscription`
Listen for enrollment status changes.

**Event Fields:**
- `enrolled: boolean` - Whether enrollment succeeded
- `reason?: string` - Reason for change (success, not_targeted, failed, etc.)
- `oid: string` - Azure AD object ID
- `serverUrls: string[]` - All servers using this OID

#### `onIntunePolicyChanged(listener: (event: IntunePolicyChangedEvent) => void): EmitterSubscription`
Listen for policy updates or removal.

**Event Fields:**
- `oid: string` - Azure AD object ID
- `changed: boolean` - Whether policy changed
- `removed?: boolean` - Whether policy was removed
- `policy?: IntunePolicy | null` - Full policy object (null if removed)
- `serverUrls: string[]` - All servers using this OID

#### `onIntuneWipeRequested(listener: (event: IntuneWipeRequestedEvent) => void): EmitterSubscription`
Listen for selective wipe requests from Intune.

**Event Fields:**
- `oid: string` - Azure AD object ID
- `serverUrls: string[]` - All servers that need wiping

#### `onIntuneAuthRequired(listener: (event: IntuneAuthRequiredEvent) => void): EmitterSubscription`
Listen for re-authentication requirements (token expired).

**Event Fields:**
- `oid: string` - Azure AD object ID
- `serverUrls: string[]` - Affected servers (empty if not yet enrolled)

#### `onIntuneConditionalLaunchBlocked(listener: (event: IntuneConditionalLaunchBlockedEvent) => void): EmitterSubscription`
Listen for conditional launch blocks (device compliance, PIN required, etc.).

**Event Fields:**
- `oid: string` - Azure AD object ID
- `reason: number` - IntuneMAMBlockAccountReason enum value
- `serverUrls: string[]` - Blocked servers

#### `onIntuneIdentitySwitchRequired(listener: (event: IntuneIdentitySwitchRequiredEvent) => void): EmitterSubscription`
Listen for identity switch requirements.

**Event Fields:**
- `oid: string` - Azure AD object ID
- `reason: string` - 'open_url', 'cancel_conditional_launch', 'document_import', or 'unknown'
- `serverUrls: string[]` - Affected servers

**All listeners return:** `EmitterSubscription` object with `.remove()` method for cleanup

## Architecture

### iOS Native Structure

```
ios/Source/
├── Protocols/
│   └── IntuneManagerDelegate.swift       # Event delegation protocol
├── Managers/
│   ├── IntuneEnrollmentManager.swift     # Main coordinator
│   ├── IntuneMSALAuthManager.swift       # MSAL authentication
│   ├── IntunePolicyProvider.swift        # Policy queries
│   └── IntuneEnrollmentStorage.swift     # Keychain storage + caching
├── Delegates/
│   ├── IntuneDelegateHandler.swift       # Base delegate class
│   ├── IntuneEnrollmentDelegateHandler.swift  # IntuneMAMEnrollmentDelegate
│   └── IntunePolicyDelegateHandler.swift      # IntuneMAMPolicyDelegate
├── Extensions/
│   └── IntuneEnrollmentManager+Events.swift   # Type-safe event enum
└── [Bridge files]
    ├── RNIntune.h / RNIntune.mm          # React Native bridge
    └── IntuneDelegateAccess.h / .mm      # Delegate accessor
```

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User: Login with Entra ID SSO                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ JavaScript: Intune.attachAndEnroll(serverUrl, loginHint)    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Native iOS: IntuneEnrollmentManager                          │
│ 1. IntuneMSALAuthManager.acquireToken()                     │
│    - Try silent first (uses cached refresh token)           │
│    - Fallback to interactive (shows Microsoft login)         │
│ 2. Extract MSALIdentity (upn, tid, oid)                     │
│ 3. IntuneEnrollmentStorage.storeEnrollment()                │
│    - Store serverUrl → identity mapping in Keychain         │
│    - Invalidate cache                                        │
│ 4. IntuneMAMEnrollmentManager.registerAndEnroll(oid)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ IntuneMAM SDK (Microsoft)                                    │
│ - Contacts Intune service                                    │
│ - Downloads policies for OID                                 │
│ - Caches policies locally                                    │
│ - Calls delegate methods                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ IntuneDelegateHandler                                        │
│ - enrollmentRequestWithStatus() callback                     │
│ - Sends IntuneEnrollmentChanged event via delegate          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ JavaScript: Event Handler                                    │
│ - Receives IntuneEnrollmentChanged event                     │
│ - Updates database with enrollment status                    │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Server Architecture

The same Azure AD account (OID) can be used across multiple Mattermost servers:

```
Keychain Storage:
{
  "https://server1.com": {upn, tid, oid: "123", serverUrl},
  "https://server2.com": {upn, tid, oid: "123", serverUrl}, // Same OID!
}

OID De-duplication:
- When enrolling: Check if OID already enrolled in SDK
  - If yes: Skip SDK enrollment (already done)
  - If no: Call SDK registerAndEnroll(oid)

- When unenrolling: Check if any other servers use this OID
  - If yes: Keep SDK enrollment (still in use)
  - If no: Call SDK deRegisterAndUnenroll() (last one)
```

### Event Flow

All events include `serverUrls` array for JavaScript context:

```typescript
{
  oid: "object-456",
  serverUrls: ["https://server1.com", "https://server2.com"],
  // ... event-specific fields
}
```

This enables JavaScript to:
- Know which servers are affected by policy changes
- Call deregisterAndUnenroll for specific servers
- Update database for specific servers
- Handle multi-server scenarios

## Logging

All operations logged via TurboLogger:

```swift
TurboLogger.write(level: .info, message: "[Intune] Silent attach succeeded, tid: abc123")
TurboLogger.write(level: .warning, message: "[Intune] Enrollment failed for domain: contoso.com")
```

**Privacy:** Only domain logged, never full UPN.

## Troubleshooting

### CocoaPods Install Fails

```bash
# Clear pod cache
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
pod install
cd ..
```

### MSAL URL Not Handled

Check:
1. Info.plist has `msauth.<BUNDLE_ID>` URL scheme
2. AppDelegate `handleMSALURL:` is called
3. Bundle ID matches exactly

### Enrollment Fails

Check:
1. Client ID is correct in Fastlane env vars
2. Redirect URI matches Azure app registration
3. Intune license is active
4. App protection policy is configured

### Git LFS Issues

```bash
# Verify LFS is tracking frameworks
git lfs ls-files

# Should show:
# IntuneMAMSwift.xcframework/**
# IntuneMAMSwiftStub.xcframework/**
```

## Build-Time Configuration

The library reads configuration from `/dist/assets/config.json` generated by Fastlane:

```json
{
  "IntuneEnabled": true,
  "IntuneClientId": "your-client-id",
  "IntuneTenantId": "organizations",
  "IntuneRedirectUri": "msauth.com.mattermost.rnbeta://auth"
}
```

## Dependencies

- **MSAL**: 2.5.1 (via CocoaPods)
- **IntuneMAM SDK**: 21.2.0 (manual XCFrameworks via Git LFS)
- **TurboLogIOSNative**: From main app Podfile

## Size Impact

- **Git Repo**: ~100-120MB (via Git LFS, only downloaded when needed)
- **IPA Size**: ~30-40MB increase

## License

Apache 2.0

## References

- [Intune App SDK for iOS - Phase 1](https://learn.microsoft.com/en-us/intune/intune-service/developer/app-sdk-ios-phase1)
- [Intune App SDK for iOS - Phase 3](https://learn.microsoft.com/en-us/intune/intune-service/developer/app-sdk-ios-phase3)
- [MSAL for iOS/macOS](https://github.com/AzureAD/microsoft-authentication-library-for-objc)
- [IntuneMAM SDK iOS GitHub](https://github.com/microsoftconnect/ms-intune-app-sdk-ios)
