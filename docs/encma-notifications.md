# ENCMA notification delivery modes

This increment adds an Android-only, per-server notification delivery choice to ENCMA. It does not start the next phase or add a custom notification-provider protocol.

## User choices

The server setup screen and **Settings → Notifications** offer:

| Choice | Delivery route |
| --- | --- |
| **Direct from this server** | The authenticated Mattermost WebSocket at the already entered server URL supplies eligible post events; ENCMA creates local Android notifications. |
| **Server push** | The existing Mattermost route remains in use: Mattermost → the administrator-configured Mattermost push proxy → FCM on Android. |
| **Off** | No background notification delivery for that server. |

Server push is the backwards-compatible default. There is deliberately no provider URL text field: a future custom provider needs a defined gateway protocol, authentication, payload semantics, and backend support.

## Direct mode

Direct mode uses the existing Mattermost URL and the app's normal authenticated network/WebSocket stack. It does not require a second notification server or a per-user server-admin setting. The app-private CA import and hostname/certificate validation described in [encma-server-certificates.md](./encma-server-certificates.md) remain applicable.

When Direct is selected and WireGuard is connected, ENCMA starts a foreground Android service with a persistent, low-importance status notification. The service keeps the Direct WebSocket delivery path eligible while ENCMA is backgrounded. Eligible `posted` events are stored through the normal post handler, filtered, deduplicated by post ID, and sent to the existing native notification builder for local display, grouping, reply actions, and channel opening.

Direct requires:

- Android ENCMA (`com.encma.hxmain`); iOS and other application builds retain their existing behavior;
- notification permission;
- a reachable Mattermost WebSocket through the configured per-app WireGuard tunnel; and
- the normal Mattermost login/session and channel data needed to evaluate preferences.

The persistent status notification is separate from message notifications. Selecting Off or leaving Direct stops the Direct service when no other active server needs it. Server removal also removes that server's saved delivery mode.

### Explicit delivery limits

This increment does **not** promise delivery after Android force-stop, reboot, process death, or WireGuard disconnection. Android OEM battery policies and Doze behavior still require device testing. A Direct selection is not a claim that a notification was delivered on a particular device.

## Preference and duplicate handling

Direct does not notify for every `posted` event. The filter uses the server-computed WebSocket mention data together with the stored current-user and channel notification settings, including:

- user/channel `push` levels (`all`, `mention`, `none`, and defaults);
- channel mute state;
- GM default mention promotion, without treating the all-member GM mention list as an explicit mention for a channel-level `mention` override;
- silent/system post exclusion and explicit force-notification handling;
- DND/OOO and `push_status`; and
- CRT follower/mention and `push_threads` rules. All-activity push alone does not independently include every CRT reply.

Direct suppresses local display while the app is active, where the normal in-app experience remains responsible for presentation. Repeated WebSocket deliveries of a post do not create repeated local notifications.

New Direct and Off logins omit the FCM device token from login and session-attachment calls. An existing session may already have a token: Mattermost does not treat an empty device ID as detachment, and `device_notification_disabled` is not a dispatch switch. ENCMA therefore keeps a small native per-server mode copy and suppresses ordinary FCM display for Direct/Off servers, while allowing clear events to clean up stale groups. Re-login is required if complete server-side token detachment is desired. Selecting Server push restores normal registration and session attachment.

The existing **Send a test notification** action tests Server push only and is hidden for Direct/Off. It is not evidence of Direct delivery.

## Backend and build requirements

Direct needs no new Mattermost notification endpoint. The Mattermost server must permit the normal authenticated API/WebSocket connection, and its URL must be reachable through the tunnel with valid TLS. No CA private key, WireGuard private configuration, Firebase credential, or production signing secret belongs in this repository.

Server push still requires the Mattermost administrator to configure push notifications and a push proxy with the appropriate Android/FCM credentials. The tracked `google-services.json` compatibility entry alone does not register a Firebase app or prove push delivery; see [encma-android.md](./encma-android.md).

## Verification

Focused JavaScript coverage is in:

- `app/managers/direct_notification/filter.test.ts`;
- `app/managers/direct_notification/mode.test.ts`;
- `app/managers/direct_notification/handler.test.ts`; and
- `app/screens/server/form.test.tsx`.

The branch Android workflow runs these tests, native unit tests, and the release APK build. Local TypeScript/ESLint results and GitHub Actions results are separate from device acceptance.

Before release, test on Android hardware with the intended server and WireGuard profile:

1. Select each mode for two different servers and confirm the choice persists independently.
2. For Direct, grant notification permission, background ENCMA, and verify the persistent status plus eligible message notifications and tap/reply behavior.
3. Verify mentions, channel mute/none, DND/OOO, GM, and CRT follower preferences against the server's expected behavior.
4. Confirm no duplicate visible message when an older FCM-registered session is switched to Direct, and confirm Server push works again after switching back.
5. Verify Off produces no background message delivery and that removing a server stops its Direct state.
6. Separately document the expected interruption behavior for force-stop, reboot/process death, and WireGuard loss; those are outside this increment's delivery promise.

No live private server, Android device, FCM delivery, or external-browser SSO acceptance is implied by this document.
