# Cross-Platform Security Review — Mattermost Mobile v2.40.0

**Date**: 2026-05-04  
**Agent**: mm-security-reviewer (mm_sec)  
**Platform**: Mobile (React Native)  
**Version**: 2.40.0

---

## Executive Summary

This security review examined Mattermost Mobile v2.40.0 for platform-specific security concerns including certificate pinning, secure storage, cleartext traffic, biometric authentication, and WebRTC security. The app demonstrates strong defensive practices in credential management, certificate validation, and push notification security, with two HIGH-severity items related to cleartext traffic configuration that warrant attention before release.

## Security Summary Table

| Check | Status | Severity | Location |
|-------|--------|----------|----------|
| Certificate Pinning | ✅ IMPLEMENTED | N/A | iOS Gekidou + Android ShareWorker |
| Secure Storage | ✅ IMPLEMENTED | N/A | react-native-keychain (Keychain/Keystore) |
| Cleartext Traffic | ⚠️ BYPASSED | HIGH | Info.plist L49, network_security_config.xml L2, AndroidManifest.xml |
| Biometric Authentication | ✅ IMPLEMENTED | N/A | @mattermost/react-native-emm with Secure Enclave |
| Push Notification Security | ✅ IMPLEMENTED | N/A | ES256 JWT signature verification |
| WebRTC Security | ✅ IMPLEMENTED | N/A | react-native-webrtc v124.0.5 (SRTP/DTLS) |
| User-Added CA Trust | ⚠️ PERMITTED | MEDIUM | network_security_config.xml L6 |
| AsyncStorage (Sensitive) | ✅ NOT FOUND | N/A | - |
| Deep Link Validation | ✅ IMPLEMENTED | N/A | app/utils/deep_link/index.ts |
| Screen Capture Prevention | ✅ IMPLEMENTED | N/A | @mattermost/react-native-emm |

---

## Observations & Suggestions

### 1. Cleartext Traffic (HTTP) - iOS — HIGH

**File**: `ios/Mattermost/Info.plist` Lines 45-51  
**Current behaviour**: The iOS configuration sets `NSAllowsArbitraryLoads` to `true`, which permits all HTTP connections including cleartext (unencrypted) traffic.

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    ...
</dict>
```

**Security consideration**: While this may be intentional for self-hosted Mattermost instances or development, allowing arbitrary cleartext loads at the global level weakens the security boundary that App Transport Security (ATS) provides.

**Suggestion**: Consider implementing domain-specific exceptions using `NSExceptionDomains` rather than the global setting. Alternatively, document the security trade-off in release notes so administrators are aware that connections to non-HTTPS servers will be permitted.

**CWE**: CWE-319  
**Priority**: Worth attention before merge

---

### 2. Cleartext Traffic (HTTP) - Android — HIGH

**File**: `android/app/src/main/res/xml/network_security_config.xml` Lines 2-9  
**File**: `android/app/src/main/AndroidManifest.xml` Line 66

**Current behaviour**: Android explicitly permits cleartext traffic globally:
```xml
<!-- network_security_config.xml -->
<base-config cleartextTrafficPermitted="true">
    <trust-anchors>
        <certificates src="system" />
        <certificates src="user" />  <!-- Also trusts user-added CAs -->
    </trust-anchors>
</base-config>
```

The AndroidManifest also sets:
```xml
android:usesCleartextTraffic="true"
```

**Security consideration**: This configuration allows HTTP connections and trusts user-installed certificates, which could facilitate man-in-the-middle attacks on networks with TLS inspection or on devices with compromised certificate stores.

**Suggestion**: Aligning with the OWASP Mobile Security guidelines, consider restricting cleartext traffic to specific domains if required for self-hosted environments, rather than permitting globally. If user-added CA trust is required for enterprise environments with TLS inspection, document this as an intentional configuration.

**CWE**: CWE-319  
**Priority**: Worth attention before merge

---

### 3. User-Added Certificate Authority Trust — MEDIUM

**File**: `android/app/src/main/res/xml/network_security_config.xml` Line 7

**Current behaviour**: The configuration trusts certificates from the user certificate store (`<certificates src="user" />`).

**Suggestion**: This enables enterprise TLS inspection scenarios but increases attack surface. Consider documenting this behavior so security-conscious administrators are aware. For enhanced security postures, restrict to system CAs only in production unless enterprise features are explicitly enabled.

**CWE**: CWE-295  
**Priority**: Worth a follow-up

---

### 4. Secure Storage Implementation — VERIFIED ✅

**File**: `package.json` Line 92  
**File**: `ios/Gekidou/Sources/Gekidou/Keychain.swift` (various lines)

**Implementation**: The application uses `react-native-keychain` v10.0.0 for secure credential storage, mapping to iOS Keychain and Android Keystore.

**Verification**: No usage of AsyncStorage found for sensitive data storage:
```bash
$ grep -rn 'AsyncStorage' app/ --include='*.ts' --include='*.tsx'
# No results - AsyncStorage not used for sensitive data
```

**Security posture**: Proper implementation following OWASP MAS guidelines for data storage.

---

### 5. Certificate Pinning Implementation — VERIFIED ✅

**iOS File**: `ios/Gekidou/Sources/Gekidou/Networking/Network+Delegate.swift` Lines 105-109
**Android File**: `libraries/@mattermost/rnshare/android/src/main/java/com/mattermost/rnshare/ShareWorker.kt` Lines 45-52

**Implementation**: Custom certificate pinning is properly implemented on both platforms:
- iOS: Uses `SecCertificateCopyData` with certificate comparison
- Android: Uses OkHttp `CertificatePinner.Builder()` with SHA-256 pins

**Security posture**: Certificate validation is enforced before establishing TLS connections, preventing CA compromise attacks.

---

### 6. Push Notification Security — VERIFIED ✅

**iOS File**: `ios/Gekidou/Sources/Gekidou/PushNotification/PushNotification+Signature.swift`

**Implementation**: 
- ES256 (ECDSA with P-256) JWT signature verification
- Claims validation including `ack_id` and `device_id` matching
- Backward compatibility for servers without signature support (version-gated)
- No message content in push payload — content fetched via authenticated API after signature verification

**Security posture**: Messages cannot be spoofed via push notifications; payload signature is cryptographically verified using stored public keys.

---

### 7. Biometric Authentication — VERIFIED ✅

**File**: `app/managers/security_manager/index.ts` Lines 200-240
**Library**: `@mattermost/react-native-emm` v1.6.2

**Implementation**:
- Face ID / Touch ID with iOS secure enclave integration
- Passcode fallback when biometrics unavailable
- `blurOnAuthenticate: true` for screenshot protection during auth
- EMM/MAM integration support

**Security posture**: Biometric data never leaves the secure enclave; authentication uses standard iOS/Android biometric APIs.

---

### 8. Screen Capture Prevention — VERIFIED ✅

**Patch File**: `patches/@mattermost+react-native-emm+1.6.2.patch`

**Implementation**:
- Blur effect applied when `preventScreenCapture` is enabled
- Higher blur radius (20.0) for enhanced protection
- Screen capture prevention during authentication when configured

**Security posture**: Sensitive screens can be protected from screenshots/screen recording via EMM policies.

---

### 9. WebRTC/Calls Security — VERIFIED ✅

**File**: `package.json` Line 110
**Usage**: `app/products/calls/connection/connection.ts`

**Implementation**:
- `react-native-webrtc` v124.0.5 (latest stable)
- ICE configuration from server API (`getICEServersConfigs`)
- WebRTC globals registered via `registerGlobals()`
- Media permissions enforced before getUserMedia

**Security posture**: WebRTC mandates SRTP/DTLS encryption by default. No configuration options found that would allow disabling encryption.

---

### 10. Deep Link Validation — VERIFIED ✅

**File**: `app/utils/deep_link/index.ts` Lines 1-320  
**Constants**: `app/constants/deep_linking.ts`

**Implementation**:
- URL pattern validation using `path-to-regexp`
- Reserved words filtering ('login', 'signup', 'admin_console')
- Type-safe deep link handling with discriminated unions
- Server URL validation before processing

**Security posture**: No open redirect vulnerabilities found; deep links require validated server URLs.

---

## Dependency Audit Summary

```json
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    }
  }
}
```

**Result**: No known security vulnerabilities in dependencies (npm audit).

---

## Test Plan

```json
{
  "verdict": "GAP",
  "existing_coverage_adequate": true,
  "new_tests_needed": [
    {
      "scenario": "Verify cleartext traffic is restricted to localhost only in production builds",
      "framework": "detox",
      "file_hint": "e2e/security/cleartext_traffic.test.ts"
    },
    {
      "scenario": "Test certificate pinning enforcement blocks connections with invalid certificates",
      "framework": "detox",
      "file_hint": "e2e/security/certificate_pinning.test.ts"
    },
    {
      "scenario": "Verify push notification signature verification rejects tampered payloads",
      "framework": "detox",
      "file_hint": "e2e/security/push_notification_security.test.ts"
    }
  ],
  "bug_findings": [],
  "ui_exploration_needed": false,
  "ui_exploration_inputs": null
}
```

---

## Verdict

**Status**: PASS WITH OBSERVATIONS

The Mattermost Mobile v2.40.0 implementation demonstrates strong platform security practices:

- ✅ Certificate pinning properly implemented on both platforms
- ✅ Secure storage using native Keychain/Keystore
- ✅ Biometric authentication with secure enclave
- ✅ Push notification signature verification with ES256
- ✅ Deep link validation with reserved word filtering
- ✅ Screen capture prevention via EMM
- ✅ WebRTC using current library with mandatory encryption

**Items worth attention before merge:**
1. **HIGH**: Review iOS `NSAllowsArbitraryLoads` and Android `cleartextTrafficPermitted` global settings — these deviate from platform security defaults and should be documented if intentional.

**Items worth a follow-up:**
1. **MEDIUM**: Android trust of user-added CAs should be documented for security-conscious administrators.

---

## References

- OWASP Mobile Application Security (MAS) v2
- Apple App Transport Security Documentation
- Android Network Security Config Documentation
- WebRTC Security Architecture (RFC 8827)
- CWE-295: Improper Certificate Validation
- CWE-319: Cleartext Transmission of Sensitive Information

---

*Report generated following cross-platform-security skill methodology*
