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

import {Device, General, Navigation} from '@constants';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import NativeNotifications from '@notifications';
import {queryCurrentChannelId} from '@queries/servers/system';
import {showOverlay} from '@screens/navigation';
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

    clearNotifications = async (channelIds: string[]) => {
        const notifications = await NativeNotifications.getDeliveredNotifications();
        for (const channelId of channelIds) {
            this.clearNotificationsForChannel(notifications, channelId);
        }
    };

    clearNotificationsForChannel = (notifications: NotificationWithChannel[], channelId: string) => {
        if (Platform.OS === 'android') {
            NativeNotifications.removeDeliveredNotifications(channelId);
        } else {
            const ids: string[] = [];
            let badgeCount = notifications.length;

            for (const notification of notifications) {
                if (notification.channel_id === channelId) {
                    ids.push(notification.identifier);
                    badgeCount--;
                }
            }

            // TODO: Set the badgeCount with default database mention count aggregate

            if (ids.length) {
                NativeNotifications.removeDeliveredNotifications(ids);
            }

            if (Platform.OS === 'ios') {
                badgeCount = badgeCount <= 0 ? 0 : badgeCount;
                Notifications.ios.setBadgeCount(badgeCount);
            }
        }
    }

    clearChannelNotifications = async (channelId: string) => {
        const notifications = await NativeNotifications.getDeliveredNotifications();
        this.clearNotificationsForChannel(notifications, channelId);
    };

    createReplyCategory = () => {
        const replyTitle = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.title'));
        const replyButton = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.button'));
        const replyPlaceholder = getLocalizedMessage(DEFAULT_LOCALE, t('mobile.push_notification_reply.placeholder'));
        const replyTextInput: NotificationTextInput = {buttonTitle: replyButton, placeholder: replyPlaceholder};
        const replyAction = new NotificationAction(REPLY_ACTION, 'background', replyTitle, true, replyTextInput);
        return new NotificationCategory(CATEGORY, [replyAction]);
    };

    handleNotification = async (notification: NotificationWithData) => {
        const {payload, foreground, userInteraction} = notification;

        if (payload) {
            switch (payload.type) {
                case NOTIFICATION_TYPE.CLEAR:
                    // TODO Notifications: Mark the channel as read
                    break;
                case NOTIFICATION_TYPE.MESSAGE:
                    // TODO Notifications: fetch the posts for the channel

                    if (foreground) {
                        this.handleInAppNotification(notification);
                    } else if (userInteraction && !payload.userInfo?.local) {
                        // Handle notification tapped
                    }
                    break;
                case NOTIFICATION_TYPE.SESSION:
                    // eslint-disable-next-line no-console
                    console.log('Session expired notification');

                    if (payload.server_url) {
                        DeviceEventEmitter.emit(General.SERVER_LOGOUT, payload.server_url);
                    }
                    break;
            }
        }
    };

    handleInAppNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;

        if (payload?.server_url) {
            const database = DatabaseManager.serverDatabases[payload.server_url]?.database;
            const channelId = await queryCurrentChannelId(database);

            if (channelId && payload.channel_id !== channelId) {
                const screen = 'Notification';
                const passProps = {
                    notification,
                };

                DeviceEventEmitter.emit(Navigation.NAVIGATION_SHOW_OVERLAY);
                showOverlay(screen, passProps);
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

        // eslint-disable-next-line no-console
        console.warn('onNotificationOpened ===============', notification);

        //   this.handleNotification(notification);
        completion();
    };

    // This triggers when the app was in the background (iOS)
    onNotificationReceivedBackground = (incoming: Notification, completion: (response: NotificationBackgroundFetchResult) => void) => {
        const notification = convertToNotificationData(incoming, false);

        // eslint-disable-next-line no-console
        console.log('onNotificationReceivedBackground ===============');
        if (notification.payload?.type === 'message') {
            //   this.handleNotification(notification);
        }

        completion(NotificationBackgroundFetchResult.NEW_DATA);
    };

    // This triggers when the app was in the foreground (Android and iOS)
    // Also triggers when the app was in the background (Android)
    onNotificationReceivedForeground = (incoming: Notification, completion: (response: NotificationCompletion) => void) => {
        const notification = convertToNotificationData(incoming, false);

        // eslint-disable-next-line no-console
        console.log('onNotificationReceivedForeground ===============', notification);
        notification.foreground = AppState.currentState === 'active';

        //   this.handleNotification(notification);
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

            const operator = DatabaseManager.appDatabase?.operator;

            if (!operator) {
                return {error: 'No App database found'};
            }

            operator.handleGlobal({
                global: [{id: GLOBAL_IDENTIFIERS.DEVICE_TOKEN, value: `${prefix}:${deviceToken}`}],
                prepareRecordsOnly: false,
            });

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
