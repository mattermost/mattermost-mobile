# ENCMA Android identity

Phase 3 changes only the Android application identity and branding. iOS remains unchanged.

- Runtime application ID: `com.encma.hxmain`
- Android display name: `ENCMA`
- Java/Kotlin namespace: retained as `com.mattermost.rnbeta` to avoid an unrelated source-package refactor
- Deep links: `mattermost://` and `mmauthbeta://` remain supported; `mmauth://` is also declared because the new non-beta application ID selects the production SSO callback scheme
- Artwork: original SVG sources are in `assets/branding/`; Android launcher, adaptive-icon, notification, and light/dark splash PNGs use the existing resource names in both `android/app/src/main/res/` and the canonical `assets/base/release/` copies used by Fastlane
- Generic Android Fastlane builds: default to the ENCMA name/ID while retaining the source namespace; the Mattermost-specific beta, PR, and release environment files remain legacy configurations, not ENCMA production release configuration

The WireGuard bridge reads `applicationContext.packageName`. It therefore allows only `com.encma.hxmain` through the per-app tunnel in this build, without a second package-name constant in the VPN implementation.

## Installation and data

The new application ID makes ENCMA a separate Android app, not an in-place update to Mattermost Beta. It can install alongside the old app and starts with separate app data. Device installation and SSO delivery still need to be exercised on Android hardware.

## Firebase and push notifications

The tracked `google-services.json` package entry is updated so Google Services build validation accepts the new application ID. **This local change does not register a new Firebase Android application or prove that push notifications work.**

Before a production release, the release owner must:

1. Register `com.encma.hxmain` in the intended Firebase project and download the newly generated `google-services.json` for that app.
2. Configure the signing-certificate fingerprints required by the Firebase services in use.
3. Replace the tracked compatibility configuration with the new app configuration through the repository's normal credential/configuration review process.
4. Configure the Mattermost push notification service for the ENCMA Android app and verify token registration, foreground/background delivery, and notification actions on a device.

No Firebase console or Mattermost push-backend change was available or performed in Phase 3.

The mobile app already registers its FCM device token with the Mattermost server. A self-hosted deployment can use **Mattermost server → self-hosted Mattermost push proxy → FCM → ENCMA**; the push-proxy URL belongs in the Mattermost server's push-notification configuration, not in a per-user app field. This removes dependence on Mattermost's hosted proxy but still uses Google FCM. Eliminating Google entirely would require a different push transport, backend support, and an Android background-delivery implementation with battery/Doze testing; a notification URL text field alone cannot provide that behavior.
