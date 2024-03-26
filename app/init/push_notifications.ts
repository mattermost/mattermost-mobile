// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, DeviceEventEmitter, Platform, type EmitterSubscription} from 'react-native';
import {
    Notification,
    NotificationAction,
    NotificationBackgroundFetchResult,
    NotificationCategory,
    type NotificationCompletion,
    Notifications,
    type NotificationTextInput,
    type Registered,
} from 'react-native-notifications';
import {requestNotifications} from 'react-native-permissions';

import {storeDeviceToken} from '@actions/app/global';
import {markChannelAsViewed} from '@actions/local/channel';
import {updateThread} from '@actions/local/thread';
import {backgroundNotification, openNotification} from '@actions/remote/notifications';
import {isCallsStartedMessage} from '@calls/utils';
import {Device, Events, Navigation, PushNotification, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import NativeNotifications from '@notifications';
import {getServerDisplayName} from '@queries/app/servers';
import {getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled, getThreadById} from '@queries/servers/thread';
import {showOverlay} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {isBetaApp} from '@utils/general';
import {isMainActivity, isTablet} from '@utils/helpers';
import {logDebug, logInfo} from '@utils/log';
import {convertToNotificationData} from '@utils/notification';

class PushNotifications {
    configured = false;
    subscriptions?: EmitterSubscription[];

    init(register: boolean) {
        this.subscriptions?.forEach((v) => v.remove());
        this.subscriptions = [
            Notifications.events().registerNotificationOpened(this.onNotificationOpened),
            Notifications.events().registerRemoteNotificationsRegistered(this.onRemoteNotificationsRegistered),
            Notifications.events().registerNotificationReceivedBackground(this.onNotificationReceivedBackground),
            Notifications.events().registerNotificationReceivedForeground(this.onNotificationReceivedForeground),
        ];

        if (register) {
            this.registerIfNeeded();
        }
    }

    async registerIfNeeded() {
        const isRegistered = await Notifications.isRegisteredForRemoteNotifications();
        if (!isRegistered) {
            await requestNotifications(['alert', 'sound', 'badge']);
        }
        Notifications.registerRemoteNotifications();
    }

    createReplyCategory = () => {
        const replyTitle = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.title'));
        const replyButton = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.button'));
        const replyPlaceholder = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.placeholder'));
        const replyTextInput: NotificationTextInput = {buttonTitle: replyButton, placeholder: replyPlaceholder};
        const replyAction = new NotificationAction(PushNotification.REPLY_ACTION, 'background', replyTitle, true, replyTextInput);
        return new NotificationCategory(PushNotification.CATEGORY, [replyAction]);
    };

    getServerUrlFromNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;

        if (!payload?.channel_id && (!payload?.server_url || !payload.server_id)) {
            return payload?.server_url;
        }

        let serverUrl = payload.server_url;
        if (!serverUrl && payload.server_id) {
            serverUrl = await DatabaseManager.getServerUrlFromIdentifier(payload.server_id);
        }

        return serverUrl;
    };

    handleClearNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;
        const serverUrl = await this.getServerUrlFromNotification(notification);

        if (serverUrl && payload?.channel_id) {
            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (database) {
                const isCRTEnabled = await getIsCRTEnabled(database);
                if (isCRTEnabled && payload.root_id) {
                    const thread = await getThreadById(database, payload.root_id);
                    if (thread?.isFollowing) {
                        const data: Partial<ThreadWithViewedAt> = {
                            unread_mentions: 0,
                            unread_replies: 0,
                            last_viewed_at: Date.now(),
                        };
                        updateThread(serverUrl, payload.root_id, data);
                    }
                } else {
                    markChannelAsViewed(serverUrl, payload.channel_id);
                }
            }
        }
    };

    handleInAppNotification = async (serverUrl: string, notification: NotificationWithData) => {
        const {payload} = notification;

        // Do not show overlay if this is a call-started message (the call_notification will alert the user)
        if (isCallsStartedMessage(payload)) {
            return;
        }

        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (database) {
            const isTabletDevice = isTablet();
            const displayName = await getServerDisplayName(serverUrl);
            const channelId = await getCurrentChannelId(database);
            const isCRTEnabled = await getIsCRTEnabled(database);
            let serverName;
            if (Object.keys(DatabaseManager.serverDatabases).length > 1) {
                serverName = displayName;
            }

            const isThreadNotification = Boolean(payload?.root_id);

            const isSameChannelNotification = payload?.channel_id === channelId;
            const isSameThreadNotification = isThreadNotification && payload?.root_id === EphemeralStore.getCurrentThreadId();

            let isInChannelScreen = NavigationStore.getVisibleScreen() === Screens.CHANNEL;
            if (isTabletDevice) {
                isInChannelScreen = NavigationStore.getVisibleTab() === Screens.HOME;
            }
            const isInThreadScreen = NavigationStore.getVisibleScreen() === Screens.THREAD;

            // Conditions:
            // 1. If not in channel screen or thread screen, show the notification
            const condition1 = !isInChannelScreen && !isInThreadScreen;

            // 2. If is in channel screen,
            //      - Show notification of other channels
            //        or
            //      - Show notification if CRT is enabled and it's a thread notification (doesn't matter if it's the same channel)
            const condition2 = isInChannelScreen && (!isSameChannelNotification || (isCRTEnabled && isThreadNotification));

            // 3. If is in thread screen,
            //      - Show the notification if it doesn't belong to the thread
            const condition3 = isInThreadScreen && !isSameThreadNotification;

            if (condition1 || condition2 || condition3) {
                // Dismiss the screen if it's already visible or else it blocks the navigation
                DeviceEventEmitter.emit(Navigation.NAVIGATION_SHOW_OVERLAY);

                const screen = Screens.IN_APP_NOTIFICATION;
                const passProps = {
                    notification,
                    serverName,
                    serverUrl,
                };

                showOverlay(screen, passProps);
            }
        }
    };

    handleMessageNotification = async (notification: NotificationWithData) => {
        const {payload, foreground, userInteraction} = notification;
        const serverUrl = await this.getServerUrlFromNotification(notification);
        if (serverUrl) {
            if (foreground) {
                // Move this to a local action
                this.handleInAppNotification(serverUrl, notification);
            } else if (userInteraction && !payload?.userInfo?.local) {
                // Handle notification tapped
                openNotification(serverUrl, notification);
            } else {
                backgroundNotification(serverUrl, notification);
            }
        }
    };

    handleSessionNotification = async (notification: NotificationWithData) => {
        logInfo('Session expired notification');

        const serverUrl = await this.getServerUrlFromNotification(notification);

        if (serverUrl) {
            if (notification.userInteraction) {
                DeviceEventEmitter.emit(Events.SESSION_EXPIRED, serverUrl);
            } else {
                DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl});
            }
        }
    };

    processNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;

        if (payload) {
            switch (payload.type) {
                case PushNotification.NOTIFICATION_TYPE.CLEAR:
                    this.handleClearNotification(notification);
                    break;
                case PushNotification.NOTIFICATION_TYPE.MESSAGE:
                    this.handleMessageNotification(notification);
                    break;
                case PushNotification.NOTIFICATION_TYPE.SESSION:
                    this.handleSessionNotification(notification);
                    break;
            }
        }
    };

    localNotification = (notification: Notification) => {
        Notifications.postLocalNotification(notification);
    };

    // This triggers when a notification is tapped and the app was in the background (iOS)
    onNotificationOpened = (incoming: Notification, completion: () => void) => {
        const notification = convertToNotificationData(incoming, false);
        notification.userInteraction = true;

        this.processNotification(notification);
        completion();
    };

    // This triggers when the app was in the background (iOS)
    onNotificationReceivedBackground = async (incoming: Notification, completion: (response: NotificationBackgroundFetchResult) => void) => {
        if (incoming.payload.verified === 'false') {
            logDebug('not handling background notification because it was not verified, ackId=', incoming.payload.ackId);
            return;
        }
        const notification = convertToNotificationData(incoming, false);
        this.processNotification(notification);

        completion(NotificationBackgroundFetchResult.NEW_DATA);
    };

    // This triggers when the app was in the foreground (Android and iOS)
    // Also triggers when the app was in the background (Android)
    onNotificationReceivedForeground = (incoming: Notification, completion: (response: NotificationCompletion) => void) => {
        if (incoming.payload.verified === 'false') {
            logDebug('not handling foreground notification because it was not verified, ackId=', incoming.payload.ackId);
            return;
        }
        const notification = convertToNotificationData(incoming, false);
        if (AppState.currentState !== 'inactive') {
            notification.foreground = AppState.currentState === 'active' && isMainActivity();

            this.processNotification(notification);
        }
        completion({alert: false, sound: true, badge: true});
    };

    onRemoteNotificationsRegistered = async (event: Registered) => {
        if (!this.configured) {
            this.configured = true;
            const {deviceToken} = event;
            let prefix;

            if (Platform.OS === 'ios') {
                prefix = Device.PUSH_NOTIFY_APPLE_REACT_NATIVE;
                if (isBetaApp) {
                    prefix = `${prefix}beta`;
                }
            } else {
                prefix = Device.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
            }

            storeDeviceToken(`${prefix}-v2:${deviceToken}`);

            // Store the device token in the default database
            this.requestNotificationReplyPermissions();
        }
        return null;
    };

    removeChannelNotifications = async (serverUrl: string, channelId: string) => {
        NativeNotifications.removeChannelNotifications(serverUrl, channelId);
    };

    removeServerNotifications = (serverUrl: string) => {
        NativeNotifications.removeServerNotifications(serverUrl);
    };

    removeThreadNotifications = async (serverUrl: string, threadId: string) => {
        NativeNotifications.removeThreadNotifications(serverUrl, threadId);
    };

    requestNotificationReplyPermissions = () => {
        if (Platform.OS === 'ios') {
            const replyCategory = this.createReplyCategory();
            Notifications.setCategories([replyCategory]);
        }
    };

    scheduleNotification = (notification: Notification) => {
        if (notification.fireDate) {
            if (Platform.OS === 'ios') {
                notification.fireDate = new Date(notification.fireDate).toISOString();
            }

            return Notifications.postLocalNotification(notification);
        }

        return 0;
    };

    cancelScheduleNotification = (notificationId: number) => {
        Notifications.cancelLocalNotification(notificationId);
    };
}

export default new PushNotifications();
