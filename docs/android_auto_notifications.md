# Android Auto Messaging Notifications

## Findings

Mattermost Mobile has **no dedicated Android Auto / Car App Library UI**. Message notifications can still surface in Android Auto when they follow the platform messaging template.

### What already existed

- FCM → `react-native-notifications` → native `CustomPushNotification` / `CustomPushNotificationHelper`
- `NotificationCompat.MessagingStyle` with `Person` (and avatars when available)
- `Notification.CATEGORY_MESSAGE` on a high-importance channel
- Inline reply via `RemoteInput` when the push payload includes `category: CAN_REPLY`
- Grouping by `channel_id` or CRT `root_id`

### Gaps addressed for Android Auto

| Requirement | Implementation |
|-------------|----------------|
| Declare Auto notification support | `res/xml/automotive_app_desc.xml` + manifest meta-data |
| Reply semantic action + no UI | `SEMANTIC_ACTION_REPLY`, `setShowsUserInterface(false)` |
| Mark-as-read action | Invisible `SEMANTIC_ACTION_MARK_AS_READ` action |
| Conversation shortcuts | Long-lived dynamic shortcuts + `setShortcutId` / `LocusId` |
| Conversation history in MessagingStyle | Per-conversation message cache used when building style |

### iOS parallel

iOS has no CarPlay app either; it uses communication notifications via `INSendMessageIntent` in the notification service extension.

## Key files

- [`android/app/src/main/java/com/mattermost/helpers/CustomPushNotificationHelper.java`](../android/app/src/main/java/com/mattermost/helpers/CustomPushNotificationHelper.java)
- [`android/app/src/main/java/com/mattermost/helpers/NotificationConversationStore.kt`](../android/app/src/main/java/com/mattermost/helpers/NotificationConversationStore.kt)
- [`android/app/src/main/java/com/mattermost/helpers/ConversationShortcutHelper.kt`](../android/app/src/main/java/com/mattermost/helpers/ConversationShortcutHelper.kt)
- [`android/app/src/main/java/com/mattermost/rnbeta/NotificationReplyBroadcastReceiver.java`](../android/app/src/main/java/com/mattermost/rnbeta/NotificationReplyBroadcastReceiver.java)
- [`android/app/src/main/java/com/mattermost/rnbeta/NotificationMarkAsReadReceiver.java`](../android/app/src/main/java/com/mattermost/rnbeta/NotificationMarkAsReadReceiver.java)

## Manual QA (Android Auto Desktop Head Unit)

1. Connect a phone with a Mattermost debug build to DHU / a head unit.
2. Receive a channel message while Auto is active — notification appears in Auto.
3. Receive a second message in the same channel — prior message remains in the conversation history read aloud / shown.
4. Use voice reply (requires server `category: CAN_REPLY`) — reply posts and appears as “Me”.
5. Mark as read from Auto — notifications for that conversation dismiss; channel is marked viewed on the server.
6. Verify DM vs channel/group conversation titles and shortcuts.
