// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, DeviceEventEmitter, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
    Notification,
    NotificationAction,
    NotificationBackgroundFetchResult,
    NotificationCategory,
    NotificationCompletion,
    Notifications,
    NotificationTextInput,
    Registered,
} from 'react-native-notifications';

import {storeDeviceToken} from '@actions/app/global';
import {markChannelAsViewed} from '@actions/local/channel';
import {backgroundNotification, openNotification} from '@actions/remote/notifications';
import {Device, Events, Navigation, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getTotalMentionsForServer} from '@database/subscription/unreads';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import NativeNotifications from '@notifications';
import {queryServerName} from '@queries/app/servers';
import {getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {showOverlay} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
import {convertToNotificationData} from '@utils/notification';

const CATEGORY = 'CAN_REPLY';
const REPLY_ACTION = 'REPLY_ACTION';
const NOTIFICATION_TYPE = {
    CLEAR: 'clear',
    MESSAGE: 'message',
    SESSION: 'session',
};

class PushNotifications {
    configured = false;

    init() {
        Notifications.registerRemoteNotifications();
        Notifications.events().registerNotificationOpened(this.onNotificationOpened);
        Notifications.events().registerRemoteNotificationsRegistered(this.onRemoteNotificationsRegistered);
        Notifications.events().registerNotificationReceivedBackground(this.onNotificationReceivedBackground);
        Notifications.events().registerNotificationReceivedForeground(this.onNotificationReceivedForeground);
    }

    cancelAllLocalNotifications = () => {
        Notifications.cancelAllLocalNotifications();
    };

    cancelChannelNotifications = async (channelId: string) => {
        const notifications = await NativeNotifications.getDeliveredNotifications();
        this.cancelNotificationsForChannel(notifications, channelId);
    };

    cancelChannelsNotifications = async (channelIds: string[]) => {
        const notifications = await NativeNotifications.getDeliveredNotifications();
        for (const channelId of channelIds) {
            this.cancelNotificationsForChannel(notifications, channelId);
        }
    };

    cancelNotificationsForChannel = (notifications: NotificationWithChannel[], channelId: string) => {
        if (Platform.OS === 'android') {
            NativeNotifications.removeDeliveredNotifications(channelId);
        } else {
            const ids: string[] = [];

            for (const notification of notifications) {
                if (notification.channel_id === channelId) {
                    ids.push(notification.identifier);
                }
            }

            if (ids.length) {
                NativeNotifications.removeDeliveredNotifications(ids);
            }

            let badgeCount = notifications.length - ids.length;

            const serversUrl = Object.keys(DatabaseManager.serverDatabases);
            const mentionPromises = serversUrl.map((url) => getTotalMentionsForServer(url));
            Promise.all(mentionPromises).then((result) => {
                badgeCount += result.reduce((acc, count) => (acc + count), 0);
                badgeCount = badgeCount <= 0 ? 0 : badgeCount;
                Notifications.ios.setBadgeCount(badgeCount);
            });
        }
    };

    createReplyCategory = () => {
        const replyTitle = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.title'));
        const replyButton = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.button'));
        const replyPlaceholder = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.placeholder'));
        const replyTextInput: NotificationTextInput = {buttonTitle: replyButton, placeholder: replyPlaceholder};
        const replyAction = new NotificationAction(REPLY_ACTION, 'background', replyTitle, true, replyTextInput);
        return new NotificationCategory(CATEGORY, [replyAction]);
    };

    getServerUrlFromNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;

        if (!payload?.channel_id && (!payload?.server_url || !payload.server_id)) {
            return undefined;
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
                    return;
                }
                markChannelAsViewed(serverUrl, payload.channel_id, false);
            }
        }
    };

    handleInAppNotification = async (serverUrl: string, notification: NotificationWithData) => {
        const {payload} = notification;

        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (database) {
            const isTabletDevice = await isTablet();
            const displayName = await queryServerName(DatabaseManager.appDatabase!.database, serverUrl);
            const channelId = await getCurrentChannelId(database);
            let serverName;
            if (Object.keys(DatabaseManager.serverDatabases).length > 1) {
                serverName = displayName;
            }

            const isDifferentChannel = payload?.channel_id !== channelId;
            const isVisibleThread = payload?.root_id === EphemeralStore.getLastViewedThreadId() && EphemeralStore.getNavigationTopComponentId() === Screens.THREAD;
            let isChannelScreenVisible = EphemeralStore.getNavigationTopComponentId() === Screens.CHANNEL;
            if (isTabletDevice) {
                isChannelScreenVisible = EphemeralStore.getVisibleTab() === Screens.HOME;
            }

            if (isDifferentChannel || (!isChannelScreenVisible && !isVisibleThread)) {
                DeviceEventEmitter.emit(Navigation.NAVIGATION_SHOW_OVERLAY);

                const screen = Screens.IN_APP_NOTIFICATION;
                const passProps = {
                    notification,
                    overlay: true,
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
        // eslint-disable-next-line no-console
        console.log('Session expired notification');

        const serverUrl = await this.getServerUrlFromNotification(notification);

        if (serverUrl) {
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl});
        }
    };

    processNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;

        if (payload) {
            switch (payload.type) {
                case NOTIFICATION_TYPE.CLEAR:
                    this.handleClearNotification(notification);
                    break;
                case NOTIFICATION_TYPE.MESSAGE:
                    this.handleMessageNotification(notification);
                    break;
                case NOTIFICATION_TYPE.SESSION:
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
        const notification = convertToNotificationData(incoming, false);
        this.processNotification(notification);

        completion(NotificationBackgroundFetchResult.NEW_DATA);
    };

    // This triggers when the app was in the foreground (Android and iOS)
    // Also triggers when the app was in the background (Android)
    onNotificationReceivedForeground = (incoming: Notification, completion: (response: NotificationCompletion) => void) => {
        const notification = convertToNotificationData(incoming, false);
        if (AppState.currentState !== 'inactive') {
            notification.foreground = AppState.currentState === 'active';

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
                if (DeviceInfo.getBundleId().includes('rnbeta')) {
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

            Notifications.postLocalNotification(notification);
        }
    };
}

export default new PushNotifications();
