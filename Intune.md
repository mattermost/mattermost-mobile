# **Mattermost Mobile — Microsoft Intune MAM Integration Guide (iOS-first)**

This document describes how Mattermost Mobile integrates with **Microsoft Intune App Protection Policies (MAM-WE)** using a **single multi-tenant vendor mobile app** created and owned by Mattermost, and **one per-tenant Server API App** created by each customer.

---

# 1. **Project Context**

Mattermost Mobile integrates with Microsoft Intune MAM (App Protection SDK v21.2.0) for organizations that license **Mattermost Enterprise Advanced**. Intune MAM is optional and activated **per server** based on customer configuration.

Our goals:

* Support Intune App Protection Policies without device enrollment (MAM-WE).
* Integrate with Entra ID login using MSAL.
* Only enforce MAM for servers using Entra SSO.
* Respect Mattermost’s existing policy precedence (AppConfig → Intune → Server Settings).
* Keep all authentication and enrollment flows native on iOS.

---

# 2. **High-Level Architecture**

### Mobile App Architecture

* Mattermost Mobile (React Native)
* MSAL (OAuth2/OIDC for authentication)
* IntuneMAMSwift SDK (App Protection)
* Multi-server support
* Local per-server isolated DB (WatermelonDB)
* Per-server isolated caches & file directories
* Extensions:

  * Notification Service Extension
  * Share Extension

### Important distinction

There are:

* **TWO (2) Mattermost Vendor Mobile Apps**, registered and owned by Mattermost in our Entra tenant.

  * Multi-tenant
  * Used for **MSAL login**, **Intune MAM enrollment**, and **policy acquisition**
  * Identified by a **single Client ID** (Prod) and optionally a **second Client ID** (Beta)

* **ONE (1) Server API App PER CUSTOMER**, used only to define a custom OAuth2 scope used by Mattermost Server.

🔹 **Customers do NOT create mobile apps.**
🔹 **All MAM flows always use Mattermost’s Vendor Mobile App.**

---

# 3. **Vendor Configuration (Mattermost team)**

This section is done **once**, by Mattermost, in our tenant.

---

## 3.1 Register the Mattermost Vendor Mobile App

* **Type:** Public client / Native mobile app
* **Supported account types:**
  *Accounts in any organizational directory (Any Entra ID tenant) — Multitenant*
* **Redirect URI (iOS):**
  Beta app: `msauth.com.mattermost.rnbeta://auth`
  Prod app: `msauth.com.mattermost.rn://auth`

This app is used for:

* MSAL login (interactive & silent)
* Intune MAM enrollment via the `msmamservice.api.application` resource
* Consistent identity across all customer tenants

Mattermost may maintain two versions:

* **Prod Client ID** — App Store release
* **Beta Client ID** — TestFlight/internal release

Both can be authorized on the customer tenant.

---

## 3.2 Configure Permissions for Vendor Mobile App

Under **Branding & properties**, the vendor mobile app must:

- Configure the name: Mattermost / Mattermost Beta
- Logo
- Homepage URL
- Terms of service URL (if available)
- Privacy statement URL (if available)
- Publisher verification (if possible)



Under **API Permissions**, the vendor mobile app must have:

| Resource                                                  | Permission           | Type      | Consent needed |
| --------------------------------------------------------- | -------------------- | --------- | -------------- |
| Microsoft Graph                                           | `User.Read`          | Delegated | Granted        |
| Intune MAM Service (0a5f63c0-b750-4f38-a71c-4fc0d58b89e2) | `user_impersonation` | Delegated | **Admin**      |

⚠️ Without the MAM service permission, enrollment will fail with:
`AADSTS650057 invalid_resource`

Under **Manifest**, the vendor mobile app must:

Set the token version to 2.

- In the Microsoft Graph App Manifest (New) manifest, set:
```json
{
  "api": {
    "requestedAccessTokenVersion": 2
  }
}

- In the AAD Graph App Manifest (Deprecating Soon) manifest, set:
```json
{
  "accessTokenAcceptedVersion": 2
}
```
---

## 3.3 iOS Configuration

To allow the app to use these configurations, we need to build them providing the ClientID of each Registered app, so that they are injected in the Info.plist during build time.

### Info.plist

```xml
<IntuneMAMSettings>
  <key>ADALClientId</key><string>$(YOUR_VENDOR_APP_CLIENT_ID)</string>
  <key>ADALRedirectUri</key><string>msauth.$(BundleID)://auth</string>
  <key>HooksAlwaysEnabled</key><true/>
  <key>ADALLogOverrideDisabled</key><true/>
  <key>AppGroupIdentifiers</key>
  <array>
    <string>$(AppGroupIdentifier)</string>
  </array>
  <key>MAMTelemetryDisabled</key><true/>
  <key>MultiIdentity</key><true/>
</IntuneMAMSettings>
```

### Entitlements (Main app only)

```xml
<key>keychain-access-groups</key>
<array>
  <string>$(AppIdentifierPrefix)com.microsoft.adalcache</string>
  <string>$(AppIdentifierPrefix)com.microsoft.intune.mam</string>
  <string>$(AppIdentifierPrefix)$(BundleID)</string>
</array>
```

Extensions (Share Extension, Notification Service Extension) **do not** include Intune keychain groups.

---

# 4. **Customer Configuration (Per Tenant)**

Each customer configures **ONE** Entra app:

## 4.1 Register the “Mattermost Server API App”

* **Type:** Single-tenant application
* **Purpose:** Define a private OAuth2 scope used by Mattermost Server and Mobile.

### Steps:

1. Create the app in Entra ID.
2. Go to **Expose an API**:

   * Set Application ID URI (e.g., `api://<SERVER_ID>`).
3. Add a scope:

```
Name: login.mattermost
Who can consent: Admins and users
Admin consent display name: Sign in to Mattermost Mobile
```

This is the scope the mobile app will request when calling the server.

---

## 4.2 Pre-Authorize Mattermost Vendor Mobile App(s)

Customers authorize the Mattermost mobile apps (Prod, Beta, or both) as clients allowed to request `login.mattermost`.

### Options:

### **Option A (Recommended): Use the automation script**

Admins run the Mattermost-provided CLI script:

```
configure-mattermost-intune-preauth.sh --server-app-id <GUID>
```

Capabilities:

* Add Beta
* Add Prod
* Add Both
* Remove Beta
* Remove Prod
* Remove Both
* Fully idempotent (safe to run many times)
* Supports `--dry-run`

The script:

* Detects the `login.mattermost` scope ID
* Adds/removes vendor client IDs under:
  **Expose an API → Authorized client applications**

### **Option B (Manual)**

Admin may alternatively:

* Go to **Expose an API → Authorized client applications**

* Add:

  * **Client ID:** Mattermost Prod Mobile App
  * **Client ID:** Mattermost Beta Mobile App (optional)

  Note: These Client ID's GUID should be made available in the feature documentation on docs.mattermost.com

* Under “Permissions” select `login.mattermost`.

---

# 5. **Authentication & Enrollment Flow**

1. User opens Mattermost Mobile.
2. MSAL is invoked using the **Vendor Mobile App** identity (Prod or Beta).
3. User authenticates to Entra ID.
4. The app sends the **access token** to Mattermost Server (`/api/v4/oauth/entra`).
5. Mattermost Server:

   * Validates token signature via OIDC metadata
   * Extracts UPN, OID, TID
   * Creates or matches a Mattermost user
   * Issues Mattermost session token
6. The app calls:
   `IntuneMAMEnrollmentManager.instance().enrollAccount(upn)`
7. Intune SDK:

   * Uses MSAL to request token for:
     `https://msmamservice.api.application/.default`
8. If permitted:
   Enrollment succeeds → App receives MAM policies.

Enrollment always uses the **Mattermost vendor mobile app** identity.

---

# 6. **Mid-Session Enrollment Detection**

If Intune is enabled after the user already logged in:

* On app launch
* On `config_changed` event
* On `license_changed` event

The app checks whether:

* Server is Intune-enabled
* Entra ID login is active
* Enrollment status is false

If so:

* UI is blurred
* User must choose **Enroll** or **Cancel**
* On success → unblur UI
* On failure → logout and clean session data

---

# 7. **Multi-Server Scenarios**

### Same Entra user (same OID)

* Only one enrollment occurs.
* All servers tied to same OID use the same MAM state.

### Different Entra users (different OID)

* Each OID has its own enrollment.
* Wipe operations apply only to the matching OID.

### Mixed environments

* Managed servers enforce MAM policies.
* Unmanaged servers behave normally.
* Switching servers updates policy enforcement accordingly.

---

# 8. **Policy Enforcement**

Policies enforced by Intune MAM SDK include:

* Clipboard restrictions
* Save location restrictions
* Screenshot blocking
* App PIN requirement
* File encryption at rest (managed paths)
* Conditional launch (OS version, jailbreak, Defender threat level)

Mattermost enforces additional controls based on policy surfaces.

---

# 9. **Selective Wipe**

When Intune triggers a selective wipe:

* Native SDK notifies the app.
* Only data tied to that OID is deleted:

  * DB path: `/AppData/work/<tid>/`
  * Cache path: per-server isolated in React Native using our Expo patches
  * File storage: managed folders only
* Other servers remain intact.

The JS bridge handles cleanup and logout procedures.

---

# 10. **Troubleshooting**

Common issues:

### `invalid_resource`

→ Missing MAM API permission on vendor mobile app
→ Admin consent not granted

### User logs in but enrollment fails

→ User does not have Intune license
→ No MAM policy targeting the app
→ Conditional Access blocking token issuance

### Repeated consent prompts

→ Server API App missing authorized client entries
→ Use Mattermost automation script

### Incorrect app identity

→ Customer attempted to create their own mobile client app (should not happen)
→ Correct Client ID in Info.plist

---

# 11. **Automation Script (Appendix A)**

Mattermost provides a script to configure authorized client applications:

```
configure-mattermost-intune-preauth.sh \
  --server-app-id <GUID> \
  --env beta|prod|both \
  --action add|remove \
  [--dry-run]
```

Capabilities:

* Add/remove **Beta**
* Add/remove **Prod**
* Add/remove **Both**
* Fully idempotent
* Prevents duplicates
* Auto-detects scope ID
* Supports **dry-run** preview mode

---

# 12. **Cache Control Architecture**

Mattermost Mobile implements **per-server isolated cache directories**:

```
{cacheRoot}/{base64(serverUrl)}/Images
{cacheRoot}/{base64(serverUrl)}/VideoThumbnails
{cacheRoot}/{base64(serverUrl)}/Files
```

This ensures:

* Selective wipe is precise and safe
* Cross-server data leakage is impossible
* React Native Image and Video components behave securely
* Consistent behavior across iOS and Android

---

# 13. **Final Notes**

* The Mattermost Vendor Mobile App is the **only** client app used for login and MAM.
* All customer tenants configure only **one Server API App**.
* All MAM operations use the vendor app identity, not per-tenant apps.
* Admins may authorize Prod, Beta, or both mobile client IDs using the provided script.

---
