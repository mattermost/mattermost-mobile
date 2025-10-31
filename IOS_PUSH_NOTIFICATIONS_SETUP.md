# iOS Push Notifications Setup for Daakia Chat

## Overview
Your iOS notification code is already configured for Daakia Chat. You need to set up certificates and provisioning profiles in Apple Developer Portal.

---

## Prerequisites
- ✅ Apple Developer Account ($99/year)
- ✅ Xcode installed
- ✅ Bundle IDs already configured: `com.daakia.chat` and `com.daakia.chat.NotificationService`

---

## Step-by-Step Setup Guide

### Step 1: Configure App IDs in Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **App IDs**
4. Find or create these two App IDs:

#### Main App ID: `com.daakia.chat`
- Click **Edit** (if exists) or **+** to create new
- **Description**: Daakia Chat
- **App ID Prefix**: Select your Team ID
- **Bundle ID**: `com.daakia.chat`
- **Capabilities** (enable these):
  - ✅ Push Notifications
  - ✅ App Groups (`group.com.daakia.chat`)
  - ✅ Keychain Sharing
  - ✅ Associated Domains
  - ✅ Background Modes (Remote notifications)
- Click **Save**

#### Notification Service Extension App ID: `com.daakia.chat.NotificationService`
- Click **+** to create new
- **Description**: Daakia Chat Notification Service
- **Bundle ID**: `com.daakia.chat.NotificationService`
- **Capabilities** (enable these):
  - ✅ App Groups (`group.com.daakia.chat`)
- Click **Save**

---

### Step 2: Create Push Notification Certificates

#### For Development:
1. Click **Certificates** → **+** (All types)
2. Select **Apple Development**
3. Click **Continue**
4. Select your App ID: `com.daakia.chat`
5. Upload your Certificate Signing Request (CSR) or generate one
6. Click **Continue**
7. Download the certificate and double-click to install in Keychain

#### For Production:
1. Click **Certificates** → **+** (All types)
2. Select **Apple Push Notification service SSL (Sandbox & Production)**
3. Click **Continue**
4. Select your App ID: `com.daakia.chat`
5. Upload your CSR
6. Download and install the certificate

#### For Notification Service Extension:
1. Create certificates for `com.daakia.chat.NotificationService` (same process)

---

### Step 3: Create App Groups

1. Navigate to **Identifiers** → **App Groups**
2. Click **+** to create new
3. **Description**: Daakia Chat App Group
4. **Identifier**: `group.com.daakia.chat`
5. Click **Continue** → **Register**

---

### Step 4: Generate Provisioning Profiles

#### For Main App (Development):
1. Click **Profiles** → **+**
2. Select **iOS App Development**
3. Click **Continue**
4. Select App ID: `com.daakia.chat`
5. Select your Development Certificate
6. Select devices (development/testing devices)
7. **Name**: `Daakia Chat Development`
8. Click **Generate** → **Download**

#### For Main App (Distribution - App Store):
1. Click **Profiles** → **+**
2. Select **App Store**
3. Select App ID: `com.daakia.chat`
4. Select your Distribution Certificate
5. **Name**: `Daakia Chat App Store`
6. Click **Generate** → **Download**

#### For NotificationService Extension:
1. Create similar profiles for `com.daakia.chat.NotificationService`
2. Make sure to select the same App Group

---

### Step 5: Configure Xcode Project

1. Open `Mattermost.xcodeproj` in Xcode
2. Select the **Mattermost** target (main app)
3. Go to **Signing & Capabilities** tab
4. **Bundle Identifier**: Verify it's `com.daakia.chat`
5. **Team**: Select your development team
6. **Provisioning Profile**: Select "Automatically manage signing" OR manually select the profiles you downloaded

#### Configure Push Notifications Capability:
1. Click **+ Capability**
2. Add **Push Notifications**
3. Add **Background Modes** (if not already added)
   - ✅ Remote notifications
   - ✅ Background fetch

#### Configure App Groups:
1. Add **App Groups** capability
2. Ensure `group.com.daakia.chat` is checked

#### Verify Entitlements:
Check that `Mattermost.entitlements` has:
- ✅ `aps-environment` (development or production)
- ✅ `com.apple.security.application-groups` with `group.com.daakia.chat`
- ✅ `com.apple.developer.usernotifications.communication` set to `true`

---

### Step 6: Configure NotificationService Extension

1. Select the **NotificationService** target
2. Go to **Signing & Capabilities**
3. **Bundle Identifier**: Should be `com.daakia.chat.NotificationService`
4. Select same Team as main app
5. Click **+ Capability** → Add **App Groups**
6. Ensure `group.com.daakia.chat` is checked
7. Verify `NotificationService.entitlements` includes the App Group

---

### Step 7: Update Server Configuration

Your Mattermost server needs to send notifications to APNs with the correct credentials.

#### Get Your APNs Key:
1. In Apple Developer Portal → **Keys**
2. Click **+** to create new key
3. **Key Name**: Daakia Chat Push Notifications
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **Download** the `.p8` key file (you can only download this once!)
7. Note the **Key ID**

#### Configure on Mattermost Server:
Update your Mattermost server's config:

```yaml
EmailSettings:
  PushNotificationServer: "https://push.mattermost.com"
  PushNotificationContents: "full"
  
iOSSettings:
  BuildID: "679"  # Or your build number
  PackageName: "com.daakia.chat"  # Your new bundle ID
  ApnsAuthKey: "path/to/AuthKey_XXXXXXXXXX.p8"  # The downloaded key
  ApnsKeyID: "XXXXXXXXXX"  # The Key ID from Apple Developer
  ApnsTeamID: "UQ8HT4Q2XM"  # Your Team ID
  ApnsCertFile: "path/to/certificate.pem"  # If using certificate (legacy method)
  ApnsCertPassword: "password"  # If certificate is password protected
```

---

### Step 8: Test Push Notifications

#### Test on Physical Device:
1. Connect an iPhone via USB
2. Select your device in Xcode scheme selector
3. Build and run (⌘ + R)
4. Go to **Settings** → **Notifications** → **Daakia Chat**
5. Ensure notifications are enabled
6. Send a test notification from your Mattermost server
7. Check device logs in Xcode Console for notification handling

#### Verify Notification Service Extension:
1. When receiving a notification, iOS should:
   - Download data from server
   - Display notification with content
   - Update badge count
   - Show sender avatar (if available)

---

## Troubleshooting

### Notifications Not Appearing:
- ✅ Verify APNs certificate/key is correct on server
- ✅ Check device has internet connection
- ✅ Verify bundle ID matches exactly
- ✅ Check notification permissions in device Settings
- ✅ Review device logs in Xcode Console

### Notification Service Extension Not Working:
- ✅ Verify App Group is configured correctly for both targets
- ✅ Check NotificationService.entitlements includes App Group
- ✅ Ensure NotificationService has proper signing certificate
- ✅ Review Xcode logs for Service Extension

### Build Errors:
- ✅ Ensure all provisioning profiles are downloaded
- ✅ Verify Team ID matches in all entitlements
- ✅ Check bundle identifiers match exactly
- ✅ Clean build folder (⌘ + Shift + K)

---

## Verification Checklist

- [ ] App IDs created in Developer Portal
- [ ] Push notification certificates created and installed
- [ ] App Group `group.com.daakia.chat` created
- [ ] Provisioning profiles generated and installed
- [ ] Xcode project configured with correct signing
- [ ] Main app has Push Notifications capability enabled
- [ ] NotificationService has App Groups capability
- [ ] Server configured with APNs credentials
- [ ] Test notification received successfully
- [ ] Badge count updates correctly

---

## Additional Resources

### File Locations:
- `ios/Mattermost/Mattermost.entitlements` - Main app entitlements
- `ios/NotificationService/NotificationService.entitlements` - Service extension entitlements
- `ios/NotificationService/NotificationService.swift` - Service extension code
- `ios/Gekidou/Sources/Gekidou/PushNotification/` - Push notification implementation

### Useful Commands:

```bash
# Check installed provisioning profiles
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision

# Verify APNs connection
nc -v -z gateway.sandbox.push.apple.com 2195

# View device logs
xcrun simctl spawn booted log stream --level=debug --predicate 'subsystem == "com.daakia.chat"'
```

---

## Next Steps

Once notifications are working:
1. Test notifications on different iOS versions
2. Verify notification grouping works correctly
3. Test notification replies (if implemented)
4. Check notification icons and avatars display properly
5. Verify badge counts update correctly
6. Test on real devices (not just simulator)

---

## Support

For issues:
- Check Apple Developer Documentation: https://developer.apple.com/documentation/usernotifications
- Mattermost Server Push Notification Docs: https://docs.mattermost.com/configure/push.html
- React Native Notifications: https://github.com/wix/react-native-notifications
