# iOS VoIP / CallKit (incoming calls when the app is backgrounded)

The mobile app registers a **PushKit** token and reports **CallKit** incoming calls when it receives a VoIP push whose payload includes `mm_voip` (see below). The standard notification (`device_id`) and WebSocket paths do not run in the background; this path is required for a native ring experience on iOS.

Before reporting an incoming call, the app briefly **releases its default `AVAudioSession`** (Mattermost sets `.playback` at launch for media). Holding `.playback` can stop CallKit from playing the **system incoming-call ring** when the app is backgrounded.

## Mobile app behavior

1. **Token** — iOS delivers a VoIP token; the app stores it as `apple_voip_rn-v2:<hex>` (or `apple_voip_rnbeta-v2:` for beta) and sends it to the server as **`voip_device_id`** on `PUT /api/v4/users/sessions/device` (same route as `device_id`).
2. **Push** — When a VoIP push arrives, the app parses `mm_voip` and **always** calls `CXProvider.reportNewIncomingCall` (PushKit expects every VoIP push to be reported to CallKit; skipping breaks reliable delivery). While the app is foreground, JS avoids playing its own ringtone (`shouldRing` checks `AppState`).
3. **Answer** — The user is taken into the app via  
   `mattermost://incoming-call?server_url=<encoded>&channel_id=<id>`  
   which opens the channel (`switchToChannelById`) and joins the call (`leaveAndJoinWithAlert`). The native layer delivers this URL through **`RCTLinkingManager`** so React Native receives it even when the app is already running (self–`openURL` is unreliable on iOS).
4. **Decline** — Ends the CallKit UI locally (`CXEndCallAction`).
5. **Remote hangup / cancel while ringing** — When the Calls WebSocket reports the call ended (or your notification path clears the incoming call), JS calls native **`endIncomingCallKit`** so the system incoming-call UI and ring stop. Without this, CallKit keeps ringing until the user dismisses it.
6. **Overlapping rings** — `CXProviderConfiguration` allows **one** incoming call per group. If a second VoIP push arrives before the first is ended, `reportNewIncomingCall` can fail until the stale call is cleared. The app ends any prior **pending** CallKit incoming before reporting a new one.

### Why VoIP sometimes “stops working” after several tries

Common causes on iOS:

- **PushKit penalties** — Apple may throttle or stop VoIP pushes if the app misuses PushKit (for example VoIP pushes that are not timely tied to an incoming call reported to CallKit), or if processing violates timing expectations.
- **Stale CallKit state** — With **`maximumCallsPerCallGroup = 1`**, a previous incoming that never finished cleanly can block the next **`reportNewIncomingCall`** until it is ended (see item 6 above).
- **Token churn** — VoIP tokens can change after reinstall or updates; **`voip_device_id`** must stay in sync on the server.

## Push payload contract (VoIP APNs)

Apple VoIP pushes use the VoIP channel (separate from alert pushes). Minimal custom payload:

```json
{
  "aps": {
    "content-available": 1
  },
  "mm_voip": {
    "call_id": "server-call-id-string",
    "channel_id": "channel-id",
    "server_url": "https://mattermost.example",
    "caller_name": "Jane Doe"
  }
}
```

- **`call_id`**: Stable string; used to derive a deterministic `UUID` for CallKit.
- **`channel_id`**, **`server_url`**: Used for the answer deep link and should match the logged-in server record.
- **`caller_name`**: Shown on the system incoming-call screen.

### Cancel VoIP push (optional, background / killed)

When the callee still has the system incoming-call UI open but the call was cancelled on the server, a **second VoIP push** can tear down CallKit if WebSocket is unavailable:

```json
{
  "aps": {
    "content-available": 1
  },
  "mm_voip": {
    "call_id": "same-server-call-id-string",
    "action": "cancel"
  }
}
```

Only **`call_id`** and **`action": "cancel"`** are required for this variant.

## Server / push-proxy / calls plugin (required follow-up)

1. **Server** — Accept optional **`voip_device_id`** on session device update; persist per session alongside `device_id`.
2. **Push proxy** — Support VoIP APNs (separate key/certificate, topic **`{bundleId}.voip`**, HTTP/2 headers `apns-push-type: voip`, `apns-priority: 10`).
3. **Mattermost Calls** — For each callee who should ring, load their stored **VoIP** token and send the payload above when a call starts (DM/GM as per product rules). Map Mattermost user/session → VoIP device token the same way as for normal mobile pushes.

Until the server sends VoIP pushes to registered tokens, CallKit will not appear for background users.
