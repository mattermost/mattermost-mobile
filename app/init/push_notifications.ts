// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, AppStateStatus, DeviceEventEmitter, EmitterSubscription, Platform} from 'react-native';
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

import {dismissAllModals, popToRoot, showOverlay} from '@screens/navigation';
import {Device, Navigation, View} from '@constants';
import {DEFAULT_LOCALE, getLocalizedMessage, t} from '@i18n';
import EphemeralStore from '@store/ephemeral_store';
import NativeNotifications from '@notifications';

const CATEGORY = 'CAN_REPLY';
const REPLY_ACTION = 'REPLY_ACTION';
const NOTIFICATION_TYPE = {
    CLEAR: 'clear',
    MESSAGE: 'message',
    SESSION: 'session',
};

class PushNotifications {
    configured = false;
    pushNotificationListener: EmitterSubscription | undefined;

    constructor() {
        Notifications.registerRemoteNotifications();
        Notifications.events().registerNotificationOpened(this.onNotificationOpened);
        Notifications.events().registerRemoteNotificationsRegistered(this.onRemoteNotificationsRegistered);
        Notifications.events().registerNotificationReceivedBackground(this.onNotificationReceivedBackground);
        Notifications.events().registerNotificationReceivedForeground(this.onNotificationReceivedForeground);
        AppState.addEventListener('change', this.onAppStateChange);

        this.getInitialNotification();
    }

    cancelAllLocalNotifications = () => {
        Notifications.cancelAllLocalNotifications();
    };

    clearNotifications = () => {
        this.setApplicationIconBadgeNumber(0);

        // TODO: Only cancel the local notifications that belong to this server
        this.cancelAllLocalNotifications();
    };

    clearChannelNotifications = async (channelId: string) => {
        const notifications = await NativeNotifications.getDeliveredNotifications();
        if (Platform.OS === 'android') {
            const notificationForChannel = notifications.find((n: NotificationWithChannel) => n.channel_id === channelId);
            if (notificationForChannel) {
                NativeNotifications.removeDeliveredNotifications(notificationForChannel.identifier, channelId);
            }
        } else {
            const ids: string[] = [];
            const badgeCount = notifications.length;

            // TODO: Set the badgeCount with default database mention count aggregate

            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i];
                if (notification.channel_id === channelId) {
                    ids.push(notification.identifier);
                }
            }

            if (ids.length) {
                NativeNotifications.removeDeliveredNotifications(ids);
            }

            this.setApplicationIconBadgeNumber(badgeCount);
        }
    };

    createReplyCategory = () => {
        const locale = DEFAULT_LOCALE; // TODO: Get the current user locale to replace the old getCurrentLocale(state);

        const replyTitle = getLocalizedMessage(locale, t('mobile.push_notification_reply.title'));
        const replyButton = getLocalizedMessage(locale, t('mobile.push_notification_reply.button'));
        const replyPlaceholder = getLocalizedMessage(locale, t('mobile.push_notification_reply.placeholder'));
        const replyTextInput: NotificationTextInput = {
            buttonTitle: replyButton,
            placeholder: replyPlaceholder,
        };
        const replyAction = new NotificationAction(REPLY_ACTION, 'background', replyTitle, true, replyTextInput);
        return new NotificationCategory(CATEGORY, [replyAction]);
    };

    getInitialNotification = async () => {
        const notification: NotificationWithData | undefined = await Notifications.getInitialNotification();

        if (notification) {
            EphemeralStore.setStartFromNotification(true);
            notification.userInteraction = true;
            this.handleNotification(notification);
        }
    };

    handleNotification = async (notification: NotificationWithData) => {
        const {payload, foreground, userInteraction} = notification;

        if (payload) {
            switch (payload.type) {
            case NOTIFICATION_TYPE.CLEAR:
                // Mark the channel as read
                break;
            case NOTIFICATION_TYPE.MESSAGE:
                // fetch the posts for the channel

                if (foreground) {
                    // Show the in-app notification
                } else if (userInteraction && !payload.userInfo?.local) {
                    // Swith to the server / team / channel that matches the notification

                    const componentId = EphemeralStore.getNavigationTopComponentId();
                    if (componentId) {
                        // Emit events to close the sidebars

                        await dismissAllModals();
                        await popToRoot();
                    }
                }
                break;
            case NOTIFICATION_TYPE.SESSION:
                // eslint-disable-next-line no-console
                console.log('Session expired notification');

                // Logout the user from the server that matches the notification

                break;
            }
        }
    };

    handleInAppNotification = async (notification: NotificationWithData) => {
        const {payload} = notification;

        // TODO: Get current channel from the database
        const currentChannelId = '';

        if (payload?.channel_id !== currentChannelId) {
            const screen = 'Notification';
            const passProps = {
                notification,
            };

            DeviceEventEmitter.emit(Navigation.NAVIGATION_SHOW_OVERLAY);
            showOverlay(screen, passProps);
        }
    }

    localNotification = (notification: Notification) => {
        Notifications.postLocalNotification(notification);
    };

    onAppStateChange = (appState: AppStateStatus) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (isActive) {
            if (!this.pushNotificationListener) {
                this.pushNotificationListener = DeviceEventEmitter.addListener(View.NOTIFICATION_IN_APP, this.handleInAppNotification);
            }
        } else if (isBackground) {
            this.pushNotificationListener?.remove();
            this.pushNotificationListener = undefined;
        }
    };

    onNotificationOpened = (notification: NotificationWithData, completion: () => void) => {
        notification.userInteraction = true;
        this.handleNotification(notification);
        completion();
    };

    onNotificationReceivedBackground = (notification: NotificationWithData, completion: (response: NotificationBackgroundFetchResult) => void) => {
        this.handleNotification(notification);
        completion(NotificationBackgroundFetchResult.NO_DATA);
    };

    onNotificationReceivedForeground = (notification: NotificationWithData, completion: (response: NotificationCompletion) => void) => {
        notification.foreground = AppState.currentState === 'active';
        completion({alert: false, sound: true, badge: true});
        this.handleNotification(notification);
    };

    onRemoteNotificationsRegistered = (event: Registered) => {
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

            EphemeralStore.deviceToken = `${prefix}:${deviceToken}`;

            // Store the device token in the default database
            this.requestNotificationReplyPermissions();
        }
    };

    requestNotificationReplyPermissions = () => {
        if (Platform.OS === 'ios') {
            const replyCategory = this.createReplyCategory();
            Notifications.setCategories([replyCategory]);
        }
    };

    setApplicationIconBadgeNumber = (value: number) => {
        if (Platform.OS === 'ios') {
            const count = value < 0 ? 0 : value;
            Notifications.ios.setBadgeCount(count);
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