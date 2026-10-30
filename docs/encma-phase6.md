# ENCMA Phase 6: native Android calls

Phase 6 adds an Android self-managed Telecom call surface. It is intended to replace the ordinary one-shot message-alert behavior for compatible incoming call pushes with phone-style ringing and call controls. The ENCMA application ID (`com.encma.hxmain`), display name, Calls v1/v2 transports, audio routing, outbound ringback, foreground in-app ringing, WireGuard, CA import, and notification delivery-mode choices remain in place.

## Mobile implementation

- A verified background `voip=true` push creates a self-managed Telecom incoming call, a high-importance CallStyle notification, and a dedicated lock-aware call activity.
- The incoming ringtone loops for the native ring window (45 seconds) instead of playing once. The existing replaceable `calls_calm` resource is used, with the system ringtone as a fallback. The Death Note/audio replacement is deliberately left for later user editing.
- Incoming controls are Answer and Decline. Ongoing controls are Mute/Unmute and Hang up. Outgoing or in-app calls are also registered with Telecom when available.
- Android 14+ starts the phone-call foreground-service type while ringing and adds the microphone type only when microphone permission has been granted.
- A killed/background process can boot the existing React Native initialization and WebSocket handlers for call correlation. Native events are buffered until all JavaScript call handlers are attached, and per-call ordering guards cover a call answered or ended during initialization.
- Server call snapshots and WebSocket call events reconcile stale native surfaces. Direct/Server push/Off suppression is evaluated before VoIP routing. Direct and Off sessions do not attach a VoIP token during login.
- While MainActivity is foreground, the existing in-app call UI owns ringing; a VoIP push is acknowledged without starting a second native ring. If Telecom is unavailable, the previous ordinary call-message notification remains the fallback.
- The former microphone-only foreground service is retained only as a fallback for calls that could not register with Telecom. A Telecom call owns the combined phone-call/microphone service instead.

## Startup/login compatibility

- Post-VPN navigation reads the active server from the app database rather than falling back to secure-storage alias discovery. With no active server, the server form does not wait for Android Keystore enumeration. This targets the reported POCO X7 / Android 16 VPN-to-logo stall; device confirmation remains pending.

- Ordinary Android startup registers the native-call headless task without eagerly loading WinterCG or the full app initialization graph. Those modules still load, with the existing retry guard and all-calls-ended lifecycle, when the native service actually invokes the task.
- Android password, Intune, and magic-link login requests omit `voip_device_id`; iOS behavior is unchanged. For Server push, the first authenticated session update attempts to attach the Android VoIP token. If an older server rejects it, Android retries without that field to preserve ordinary push registration and contains any second failure instead of creating an unhandled rejection. Direct and Off skip this session attachment.
- This compatibility behavior is not a substitute for the backend calling changes. A server that rejects Android VoIP session attachment can still allow login and ordinary Server push, but it cannot provide native incoming calls until its Calls/VoIP contract is compatible.

## Required server and push-proxy deployment

**The mobile app and a successful mobile CI build are not sufficient for live native incoming calls.** A compatible Mattermost server and push proxy must be deployed and configured together.

The end-to-end route is:

`Mattermost Calls/server → compatible Mattermost push proxy → high-priority FCM data message → ENCMA Telecom`

The deployment must provide all of the following:

1. **A compatible Mattermost server/Calls implementation.** It must initiate the incoming-call push for the callee's registered Android VoIP device ID and supply the normal signed notification/call correlation data. The reference server commit `a5e28edb4f4733011898a7f9c74787c8bca37390` specifically permits Android device IDs in `voip_device_id` login/session attachment validation; that token-validation change alone does not configure Calls or prove call-push generation. The app consumes the server/channel/post/thread and caller fields, `ack_id`, signature data, and `voip=true`; it does not ring for an unsigned or unverifiable push.
2. **A compatible push proxy.** It must recognize the VoIP request, preserve it as an FCM data message with `data["voip"]="true"`, use appropriate high-priority delivery, and expire undelivered requests within the call's ring window rather than delivering a stale call much later. Reference PR 162, commit `777fe456c21e0913dcfa8f4b61a9c60c2b4fa149`, uses a 30-second TTL.
3. **Correct production FCM configuration for `com.encma.hxmain`.** The tracked compatibility `google-services.json` does not register a Firebase app or prove FCM delivery. The Firebase app, Android credentials, push-proxy configuration, and signing setup must be completed by the release owner.
4. **Server push mode for that server.** Direct and Off intentionally suppress this FCM route. Existing sessions can retain old server-side tokens, so native per-server suppression remains necessary; an empty device ID on a later login is not treated as detaching an old session.
5. **Reachable authenticated APIs/WebSockets.** Answering and lifecycle reconciliation still need the normal Mattermost session, TLS chain/hostname validation, any imported app-private CA, and the configured per-app WireGuard route. Certificate validation is never disabled for calls.

Upstream's unmerged/reference work is useful for comparing the backend contract, but is not evidence that an ENCMA deployment is compatible:

- Mattermost server `android-ring` branch: <https://github.com/mattermost/mattermost/tree/android-ring>
- Mattermost push-proxy PR 162: <https://github.com/mattermost/mattermost-push-proxy/pull/162>
- Upstream native Android call tracking issue: <https://github.com/mattermost/mattermost/issues/39177>

Review and deploy the changes against the actual server/Calls and push-proxy versions in use. Do not deploy a branch or PR solely because the mobile APK built successfully. Without compatible backend delivery, the app cannot manufacture a native incoming call from an ordinary FCM message.

## Focused validation

The branch Android workflow includes the affected native-call, headless-boot, push-notification, call-state, session, and notification-mode Jest suites, followed by Android unit tests and an arm64 release build. Local TypeScript, ESLint, XML, and diff checks are additional source checks; none is a live call-delivery test.

## Required physical-device acceptance

Use the intended Android hardware, compatible server/Calls deployment, compatible push proxy, production FCM configuration, and WireGuard/CA setup. Record device model, Android version, app build SHA, server/Calls versions, and push-proxy commit/version with the results.

At minimum verify:

1. **Ordinary startup and login:** cold foreground launch reaches the server screen without a headless-initialization failure; password login succeeds, plus Intune/magic-link where used. On an older server, login and ordinary Server push still work even if Android VoIP session attachment is rejected. Record any server response or logcat evidence if this fails.
2. **Background and killed-process ringing:** continuous phone-style audio for the expected ring window, not a single message sound; caller name/avatar; no duplicate ordinary call-message notification.
3. **Lock screen and permissions:** full-screen/CallStyle presentation, Answer/Decline, microphone permission flow, and behavior when full-screen-intent or notification permission is denied.
4. **Live call controls:** successful RTC join, microphone capture, mute/unmute in both native and in-app directions, local hang-up, remote hang-up, ring timeout, answered/declined elsewhere, and caller cancellation while JavaScript is still booting.
5. **Lifecycle:** swipe-away/killed process, screen off, MainActivity recreation, returning to the in-app call, and leaving/re-entering a call. Android **force-stop is different**: FCM is not expected to wake a force-stopped app; do not count that as a supported cold-start case.
6. **Transport preservation:** Calls v1 and v2, outgoing calls, outbound ringback, foreground in-app ringing, speaker/earpiece/Bluetooth routing, and the legacy microphone-service fallback when Telecom is unavailable.
7. **Per-server behavior:** Server push produces native calls with the compatible backend; Direct/Off do not leak VoIP tokens or display suppressed FCM calls; multiple servers retain independent modes.
8. **Network security:** calls and answer/reconciliation work through the approved WireGuard and imported CA without disabling certificate-chain or hostname validation.

CI success and installation of the APK establish build/install evidence only. Ringing, lock-screen UI, answer/decline, audio, backend compatibility, and FCM delivery remain unverified until these physical-device and deployment checks pass.
