package com.mattermost.helpers;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.app.RemoteInput;
import androidx.core.graphics.drawable.IconCompat;

import com.mattermost.rnbeta.*;
import com.nozbe.watermelondb.WMDatabase;

import java.io.IOException;
import java.util.Date;
import java.util.Objects;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

import static com.mattermost.helpers.database_extension.GeneralKt.getDatabaseForServer;
import static com.mattermost.helpers.database_extension.UserKt.getLastPictureUpdate;

public class CustomPushNotificationHelper {
    public static final String CHANNEL_HIGH_IMPORTANCE_ID = "channel_01";
    public static final String CHANNEL_MIN_IMPORTANCE_ID = "channel_02";
    public static final String KEY_TEXT_REPLY = "CAN_REPLY";
    public static final int MESSAGE_NOTIFICATION_ID = 435345;
    public static final String NOTIFICATION_ID = "notificationId";
    public static final String NOTIFICATION = "notification";
    public static final String PUSH_TYPE_MESSAGE = "message";
    public static final String PUSH_TYPE_CLEAR = "clear";
    public static final String PUSH_TYPE_SESSION = "session";
    public static final String CATEGORY_CAN_REPLY = "CAN_REPLY";

    private static NotificationChannel mHighImportanceChannel;
    private static NotificationChannel mMinImportanceChannel;

    private static final OkHttpClient client = new OkHttpClient();

    private static final BitmapCache bitmapCache = new BitmapCache();

    private static void addMessagingStyleMessages(Context context, NotificationCompat.MessagingStyle messagingStyle, String conversationTitle, Bundle bundle) {
        String message = bundle.getString("message", bundle.getString("body"));
        String senderId = bundle.getString("sender_id");
        String serverUrl = bundle.getString("server_url");
        String type = bundle.getString("type");
        String urlOverride = bundle.getString("override_icon_url");
        if (senderId == null) {
            senderId = "sender_id";
        }
        String senderName = getSenderName(bundle);

        if (conversationTitle == null || !android.text.TextUtils.isEmpty(senderName.trim())) {
            message = removeSenderNameFromMessage(message, senderName);
        }

        long timestamp = new Date().getTime();
        Person.Builder sender = new Person.Builder()
                .setKey(senderId)
                .setName(senderName);

        if (serverUrl != null && type != null && !type.equals(CustomPushNotificationHelper.PUSH_TYPE_SESSION)) {
            try {
                Bitmap avatar = userAvatar(context, serverUrl, senderId, urlOverride);
                if (avatar != null) {
                    sender.setIcon(IconCompat.createWithBitmap(avatar));
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        messagingStyle.addMessage(message, timestamp, sender.build());
    }

    private static void addNotificationExtras(NotificationCompat.Builder notification, Bundle bundle) {
        Bundle userInfoBundle = bundle.getBundle("userInfo");
        if (userInfoBundle == null) {
            userInfoBundle = new Bundle();
        }

        String channelId = bundle.getString("channel_id");
        if (channelId != null) {
            userInfoBundle.putString("channel_id", channelId);
        }

        String postId = bundle.getString("post_id");
        if (postId != null) {
            userInfoBundle.putString("post_id", postId);
        }

        String rootId = bundle.getString("root_id");
        if (rootId != null) {
            userInfoBundle.putString("root_id", rootId);
        }

        String crtEnabled = bundle.getString("is_crt_enabled");
        if (crtEnabled != null) {
            userInfoBundle.putString("is_crt_enabled", crtEnabled);
        }

        String serverUrl = bundle.getString("server_url");
        if (serverUrl != null) {
            userInfoBundle.putString("server_url", serverUrl);
        }

        notification.addExtras(userInfoBundle);
    }

    @SuppressLint("UnspecifiedImmutableFlag")
    private static void addNotificationReplyAction(Context context, NotificationCompat.Builder notification, Bundle bundle, int notificationId) {
        String postId = bundle.getString("post_id");
        String serverUrl = bundle.getString("server_url");
        boolean canReply = bundle.containsKey("category") && Objects.equals(bundle.getString("category"), CATEGORY_CAN_REPLY);

        if (android.text.TextUtils.isEmpty(postId) || serverUrl == null || !canReply) {
            return;
        }

        Intent replyIntent = new Intent(context, NotificationReplyBroadcastReceiver.class);
        replyIntent.setAction(KEY_TEXT_REPLY);
        replyIntent.putExtra(NOTIFICATION_ID, notificationId);
        replyIntent.putExtra(NOTIFICATION, bundle);

        PendingIntent replyPendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            replyPendingIntent = PendingIntent.getBroadcast(
                    context,
                    notificationId,
                    replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        } else {
            replyPendingIntent = PendingIntent.getBroadcast(
                    context,
                    notificationId,
                    replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT);
        }

        RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
                .setLabel("Reply")
                .build();

        int icon = R.drawable.ic_notif_action_reply;
        CharSequence title = "Reply";
        NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(icon, title, replyPendingIntent)
                .addRemoteInput(remoteInput)
                .setAllowGeneratedReplies(true)
                .build();

        notification
                .setShowWhen(true)
                .addAction(replyAction);
    }

    public static NotificationCompat.Builder createNotificationBuilder(Context context, PendingIntent intent, Bundle bundle, boolean createSummary) {
        final NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_HIGH_IMPORTANCE_ID);

        String channelId = bundle.getString("channel_id");
        String postId = bundle.getString("post_id");
        String rootId = bundle.getString("root_id");
        int notificationId = postId != null ? postId.hashCode() : MESSAGE_NOTIFICATION_ID;

        boolean is_crt_enabled = bundle.containsKey("is_crt_enabled") && Objects.equals(bundle.getString("is_crt_enabled"), "true");
        String groupId = is_crt_enabled && !android.text.TextUtils.isEmpty(rootId) ? rootId : channelId;

        addNotificationExtras(notification, bundle);
        setNotificationIcons(context, notification, bundle);
        setNotificationMessagingStyle(context, notification, bundle);
        setNotificationGroup(notification, groupId, createSummary);
        setNotificationBadgeType(notification);

        setNotificationChannel(context, notification);
        setNotificationDeleteIntent(context, notification, bundle, notificationId);
        addNotificationReplyAction(context, notification, bundle, notificationId);

        notification
                .setContentIntent(intent)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setPriority(Notification.PRIORITY_HIGH)
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setAutoCancel(true);

        return notification;
    }

    public static void createNotificationChannels(Context context) {
        // Notification channels are not supported in Android Nougat and below
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        final NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        if (mHighImportanceChannel == null) {
            mHighImportanceChannel = new NotificationChannel(CHANNEL_HIGH_IMPORTANCE_ID, "High Importance", NotificationManager.IMPORTANCE_HIGH);
            mHighImportanceChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(mHighImportanceChannel);
        }

        if (mMinImportanceChannel == null) {
            mMinImportanceChannel = new NotificationChannel(CHANNEL_MIN_IMPORTANCE_ID, "Min Importance", NotificationManager.IMPORTANCE_MIN);
            mMinImportanceChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(mMinImportanceChannel);
        }
    }

    private static Bitmap getCircleBitmap(Bitmap bitmap) {
        final Bitmap output = Bitmap.createBitmap(bitmap.getWidth(),
                bitmap.getHeight(), Bitmap.Config.ARGB_8888);
        final Canvas canvas = new Canvas(output);

        final int color = Color.RED;
        final Paint paint = new Paint();
        final Rect rect = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
        final RectF rectF = new RectF(rect);

        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(color);
        canvas.drawOval(rectF, paint);

        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rect, paint);

        bitmap.recycle();

        return output;
    }

    private static String getConversationTitle(Bundle bundle) {
        String title = bundle.getString("channel_name");

        if (android.text.TextUtils.isEmpty(title)) {
            title = bundle.getString("sender_name");
        }

        if (android.text.TextUtils.isEmpty(title)) {
            title = bundle.getString("title", "");
        }

        return title;
    }

    private static NotificationCompat.MessagingStyle getMessagingStyle(Context context, Bundle bundle) {
        NotificationCompat.MessagingStyle messagingStyle;
        final String senderId = "me";
        final String serverUrl = bundle.getString("server_url");
        final String type = bundle.getString("type");
        String urlOverride = bundle.getString("override_icon_url");

        Person.Builder sender = new Person.Builder()
                .setKey(senderId)
                .setName("Me");

        if (serverUrl != null && type != null && !type.equals(CustomPushNotificationHelper.PUSH_TYPE_SESSION)) {
            try {
                Bitmap avatar = userAvatar(context, serverUrl, "me", urlOverride);
                if (avatar != null) {
                    sender.setIcon(IconCompat.createWithBitmap(avatar));
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        messagingStyle = new NotificationCompat.MessagingStyle(sender.build());

        String conversationTitle = getConversationTitle(bundle);
        setMessagingStyleConversationTitle(messagingStyle, conversationTitle, bundle);
        addMessagingStyleMessages(context, messagingStyle, conversationTitle, bundle);

        return messagingStyle;
    }

    private static String getSenderName(Bundle bundle) {
        String senderName = bundle.getString("sender_name");
        if (senderName != null) {
            return senderName;
        }

        String channelName = bundle.getString("channel_name");
        if (channelName != null && channelName.startsWith("@")) {
            return channelName;
        }

        String message = bundle.getString("message");
        if (message != null) {
            String name = message.split(":")[0];
            if (!name.equals(message)) {
                return name;
            }
        }

        return getConversationTitle(bundle);
    }

    private static String removeSenderNameFromMessage(String message, String senderName) {
        int index = message.indexOf(senderName);
        if (index == 0) {
            message = message.substring(senderName.length());
        }

        return message.replaceFirst(": ", "").trim();
    }

    private static void setMessagingStyleConversationTitle(NotificationCompat.MessagingStyle messagingStyle, String conversationTitle, Bundle bundle) {
        String channelName = getConversationTitle(bundle);
        String senderName = bundle.getString("sender_name");
        if (TextUtils.isEmpty(senderName)) {
            senderName = getSenderName(bundle);
        }

        if (conversationTitle != null && !channelName.equals(senderName)) {
            messagingStyle.setConversationTitle(conversationTitle);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                messagingStyle.setGroupConversation(true);
            }
        }
    }

    private static void setNotificationBadgeType(NotificationCompat.Builder notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notification.setBadgeIconType(NotificationCompat.BADGE_ICON_LARGE);
        }
    }

    private static void setNotificationChannel(Context context, NotificationCompat.Builder notification) {
        // If Android Oreo or above we need to register a channel
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        if (mHighImportanceChannel == null) {
            createNotificationChannels(context);
        }
        NotificationChannel notificationChannel = mHighImportanceChannel;
        notification.setChannelId(notificationChannel.getId());
    }

    private static void setNotificationDeleteIntent(Context context, NotificationCompat.Builder notification, Bundle bundle, int notificationId) {
        // Let's add a delete intent when the notification is dismissed
        final String PUSH_NOTIFICATION_EXTRA_NAME = "pushNotification";
        Intent delIntent = new Intent(context, NotificationDismissService.class);
        delIntent.putExtra(NOTIFICATION_ID, notificationId);
        delIntent.putExtra(PUSH_NOTIFICATION_EXTRA_NAME, bundle);
        @SuppressLint("UnspecifiedImmutableFlag")
        PendingIntent deleteIntent = PendingIntent.getService(context, (int) System.currentTimeMillis(), delIntent, PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);
        notification.setDeleteIntent(deleteIntent);
    }

    private static void setNotificationMessagingStyle(Context context, NotificationCompat.Builder notification, Bundle bundle) {
        NotificationCompat.MessagingStyle messagingStyle = getMessagingStyle(context, bundle);
        notification.setStyle(messagingStyle);
    }

    private static void setNotificationGroup(NotificationCompat.Builder notification, String channelId, boolean setAsSummary) {
        notification.setGroup(channelId);

        if (setAsSummary) {
            // if this is the first notification for the channel then set as summary, otherwise skip
            notification.setGroupSummary(true);
        }
    }

    private static void setNotificationIcons(Context context, NotificationCompat.Builder notification, Bundle bundle) {
        String channelName = getConversationTitle(bundle);
        String senderName = bundle.getString("sender_name");
        String serverUrl = bundle.getString("server_url");
        String urlOverride = bundle.getString("override_icon_url");

        notification.setSmallIcon(R.mipmap.ic_notification);

        if (serverUrl != null && channelName.equals(senderName)) {
            try {
                String senderId = bundle.getString("sender_id");
                Bitmap avatar = userAvatar(context, serverUrl, senderId, urlOverride);
                if (avatar != null) {
                    notification.setLargeIcon(avatar);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private static Bitmap userAvatar(final Context context, @NonNull final String serverUrl, final String userId, final String urlOverride) throws IOException {
        try {
            Response response;
            Double lastUpdateAt = 0.0;
            if (!TextUtils.isEmpty(urlOverride)) {
                Request request = new Request.Builder().url(urlOverride).build();
                Log.i("ReactNative", String.format("Fetch override profile image %s", urlOverride));
                response = client.newCall(request).execute();
            } else {
                DatabaseHelper dbHelper = DatabaseHelper.Companion.getInstance();
                if (dbHelper != null) {
                    WMDatabase db = getDatabaseForServer(dbHelper, context, serverUrl);
                    if (db != null) {
                        lastUpdateAt = getLastPictureUpdate(db, userId);
                        if (lastUpdateAt == null) {
                            lastUpdateAt = 0.0;
                        }
                        db.close();
                    }
                }
                Bitmap cached = bitmapCache.bitmap(userId, lastUpdateAt, serverUrl);
                if (cached != null) {
                    Bitmap bitmap = cached.copy(cached.getConfig(), false);
                    return getCircleBitmap(bitmap);
                }

                bitmapCache.removeBitmap(userId, serverUrl);
                String url = String.format("api/v4/users/%s/image", userId);
                Log.i("ReactNative", String.format("Fetch profile image %s", url));
                response = Network.getSync(serverUrl, url, null);
            }

            if (response.code() == 200) {
                assert response.body() != null;
                byte[] bytes = Objects.requireNonNull(response.body()).bytes();
                Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (TextUtils.isEmpty(urlOverride) && !TextUtils.isEmpty(userId)) {
                    bitmapCache.insertBitmap(bitmap.copy(bitmap.getConfig(), false), userId, lastUpdateAt, serverUrl);
                }
                return getCircleBitmap(bitmap);
            }

            return null;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
