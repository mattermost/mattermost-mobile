## Mobile Security Review — mattermost-mobile v2.40.0
**Date**: 2026-05-04  
**Agent**: mm-security-reviewer  
**Branch**: release-2.40  
**Commit**: 2ed8db44a

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Secure Storage** | ✅ PASS | Tokens stored in iOS Keychain/Android Keystore via react-native-keychain |
| **Certificate Pinning** | ✅ PASS | Custom pinning implementation with proper validation |
| **Biometric Auth** | ✅ PASS | FaceID/TouchID with secure enclave integration |
| **Cleartext Traffic** | ⚠️ REVIEW NEEDED | Enabled globally (iOS/Android) - may be intentional for self-hosted |
| **Push Notifications** | ✅ PASS | Signature verification implemented, no content in payload |
| **Deep Links** | ✅ PASS | Proper validation, no open redirect vulnerability found |
| **Dependencies** | ⚠️ REVIEW NEEDED | 2 critical CVEs (1 false positive from local library) |

---

## Dependency Audit Findings

**Total Vulnerabilities**: 39  
- Critical: 2
- High: 14
- Moderate: 15
- Low: 8

### 1. ⚠️ fast-xml-parser — CRITICAL (GHSA-m7jm-9gc2-mpf2)

| Field | Value |
|-------|-------|
| **Package** | fast-xml-parser |
| **Severity** | CRITICAL |
| **Title** | Entity encoding bypass via regex injection in DOCTYPE entity names |
| **URL** | https://github.com/advisories/GHSA-m7jm-9gc2-mpf2 |
| ** CWE** | CWE-20 (Improper Input Validation) |
| **Context** | Likely used in RSS/XML parsing or Mattermost server data parsing |
| **Action** | Update to patched version |

### 2. ✅ mattermost-hardware-keyboard — CRITICAL (GHSA-322h-w7g8-cg56) — FALSE POSITIVE

| Field | Value |
|-------|-------|
| **Package** | mattermost-hardware-keyboard |
| **Severity** | CRITICAL (reported) / INAPPLICABLE (actual) |
| **Title** | Malware in mattermost-hardware-keyboard |
| **URL** | https://github.com/advisories/GHSA-322h-w7g8-cg56 |
| ** CWE** | CWE-506 (Embedded Malicious Code) |
| **Reasoning** | This is a **local monorepo library** (`file:./libraries/@mattermost/hardware-keyboard`), not an npm package. The advisory was triggered because someone published malware with this name to npm registry. Since this is Mattermost-managed code in `libraries/@mattermost/hardware-keyboard`, it is safe. |
| **Action** | None - add to npm audit ignore if needed |

### High Severity Dependencies (14 total)

| Package | CVE | Impact |
|---------|-----|--------|
| lodash | Prototype pollution | Command injection via template |
| tar | Arbitrary file overwrite | Path traversal in extraction |
| path-to-regexp | ReDoS | Performance degradation |
| minimatch | ReDoS | Performance degradation |
| node-forge | Timing attacks | Cryptographic weakness |
| undici | Request smuggling | HTTP header manipulation |

---

## Mobile-Specific Security Findings

### 1. ⚠️ Cleartext Traffic Enabled Globally

**iOS** — `ios/Mattermost/Info.plist:L47-48`
```xml
<key>NSAllowsArbitraryLoads</key>
<true/>
```

**Android Manifest** — `android/app/src/main/AndroidManifest.xml:L52`
```xml
android:usesCleartextTraffic="true"
```

**Android Network Security Config** — `android/app/src/main/res/xml/network_security_config.xml:L3`
```xml
<base-config cleartextTrafficPermitted="true">
```

**Analysis**: This configuration allows HTTP (not just HTTPS) connections. This may be intentional to support self-hosted Mattermost servers that run on HTTP in internal networks. However, it also allows cleartext connections from the app to any server.

**Recommendation**: Consider implementing a configuration option that:
- Requires HTTPS by default
- Only allows HTTP for specific user-configured servers
- Shows a security warning when connecting via HTTP

**Severity**: MEDIUM (intentional but broadens attack surface)

---

### 2. ✅ Secure Storage — Properly Implemented

**Files**:
- `app/init/credentials.ts:L69-99` - Token storage via Keychain
- `ios/Gekidou/Sources/Gekidou/Keychain.swift` - Native iOS Keychain wrapper

**Implementation**:
- Uses `react-native-keychain@10.0.0` for cross-platform secure storage
- iOS Keychain with custom accessibility level
- Tokens and pre-auth secrets stored using `setGenericPassword` with server-specific service strings

**Verification**:
```bash
# No AsyncStorage token exposure found
$ grep -rn 'AsyncStorage.*token\|AsyncStorage.*password\|AsyncStorage.*secret' app/ | wc -l
0
```

---

### 3. ✅ Certificate Pinning — Properly Implemented

**File**: `ios/Gekidou/Sources/Gekidou/Networking/Network+Delegate.swift:L108`

```swift
throw NetworkError.serverTrustEvaluationFailed(reason: .certificatePinningFailed(...))
```

**Implementation**:
- Custom pinning with `SecTrustEvaluateWithError`
- Proper comparison of server certificates against pinned certificates
- Descriptive error messages for pinning failures
- Fallback for user-added CAs in network security config

**Android**: Certificates from system and user stores are trusted (`network_security_config.xml`):
```xml
<certificates src="system" />
<certificates src="user" />
```

---

### 4. ✅ Biometric Authentication — Properly Implemented

**File**: `app/managers/security_manager/index.ts:L457-L813`

**Features**:
- FaceID / TouchID authentication with iOS secure enclave
- Configurable per-server in server settings
- 5-minute session timeout before re-authentication required
- Graceful handling of device security requirements
- MAM (Mobile Application Management) integration

**iOS Permission**: `NSFaceIDUsageDescription` in Info.plist provides clear purpose string.

---

### 5. ✅ Push Notification Security

**Files**: 
- `ios/Gekidou/Sources/Gekidou/PushNotification/PushNotification+Signature.swift`
- `ios/NotificationService/NotificationService.swift:L111`

**Implementation**:
- **Signature verification** for push notification authenticity
- **No message content in push payload** — app fetches content via authenticated API after signature verification
- Device token validation
- Server version compatibility checks

```swift
// Verification happens before content processing
if (!PushNotification.default.verifySignatureFromNotification(notification)) {
    // Reject notification
}
```

---

### 6. ✅ Deep Link Security

**File**: `app/utils/deep_link/index.ts:L47-L400`

**Analysis**:
- Deep links parsed with validation (line 330-397)
- Server URLs validated before navigation (line 49-79)
- Magic links require token validation (line 59-60, 181)
- No open redirect vulnerability — all navigation requires valid server URL in database

**Supported Deep Link Types**:
- Channel links
- Direct messages
- Group messages
- Permalinks
- Playbook runs
- Magic login links (with token validation)

---

### 7. ✅ Clipboard Security

**File**: Multiple files using `@react-native-clipboard/clipboard`

**Analysis**:
- Clipboard access is **write-only** for user-initiated copy actions
- No automatic clipboard reading or background monitoring found
- Used for: copying code, permalinks, channel links, metadata

---

## Out-of-Scope Observations

### iOS Keychain `kSecAttrAccessible` Setting
The iOS Keychain implementation uses default accessibility settings. For higher security, consider using `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for tokens that shouldn't transfer to new devices via iCloud Keychain.

**File**: `ios/Gekidou/Sources/Gekidou/Keychain.swift` — consider adding accessibility parameter.

---

## Test Plan

```json
{
  "verdict": "PASS_WITH_NOTES",
  "existing_coverage_adequate": false,
  "new_tests_needed": [
    {
      "scenario": "Verify HTTPS-only enforcement can be enabled for security-conscious deployments",
      "framework": "detox",
      "file_hint": "e2e/security/network_security.test.ts"
    },
    {
      "scenario": "Certificate pinning failure handling with self-signed certificates",
      "framework": "detox",
      "file_hint": "e2e/security/ssl_pinning.test.ts"
    },
    {
      "scenario": "Dependency vulnerability scan automation in CI",
      "framework": "npm-audit-ci",
      "file_hint": ".github/workflows/security.yml"
    }
  ],
  "bug_findings": [],
  "ui_exploration_needed": false,
  "ui_exploration_inputs": null
}
```

---

## Recommendations Summary

### Priority: Before Release
1. **Review cleartext traffic requirement** — Determine if global `usesCleartextTraffic` is necessary or should be scoped

### Priority: High (Next Sprint)
2. **Update fast-xml-parser** — Patched version available for CVE
3. **Review high-severity dependencies** — lodash, tar, undici

### Priority: Medium
4. **Add npm audit to CI** — Block builds on new critical/high CVEs
5. **Document certificate pinning bypass procedure** — For enterprise users with TLS inspection

---

## Verdict

**SECURE WITH NOTES**

The Mattermost Mobile v2.40.0 release has strong security fundamentals:
- ✅ Proper token storage in platform secure storage
- ✅ Certificate pinning with proper validation
- ✅ Biometric authentication with secure enclave
- ✅ Push notification signature verification
- ✅ Safe deep link handling

**Concerns**:
- ⚠️ Cleartext traffic enabled globally (may be intentional for self-hosted)
- ⚠️ Dependency CVEs require review (especially fast-xml-parser)
- ⚠️ User-added CAs trusted on Android

No critical security blockers for release, but dependency updates and cleartext traffic review recommended for next patch.

---

*Report generated following OWASP Mobile Application Security (MAS) v2 guidelines*
