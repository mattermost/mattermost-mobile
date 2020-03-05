// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState} from 'react-native';
import NotificationsIOS, {
    NotificationAction,
    NotificationCategory,
    DEVICE_REMOTE_NOTIFICATIONS_REGISTERED_EVENT,
    DEVICE_NOTIFICATION_RECEIVED_FOREGROUND_EVENT,
    DEVICE_NOTIFICATION_OPENED_EVENT,
} from 'react-native-notifications';

import {getBadgeCount} from 'app/selectors/views';
import EphemeralStore from 'app/store/ephemeral_store';
import {getCurrentLocale} from 'app/selectors/i18n';
import {getLocalizedMessage} from 'app/i18n';
import {t} from 'app/utils/i18n';

const CATEGORY = 'CAN_REPLY';
const REPLY_ACTION = 'REPLY_ACTION';

class PushNotification {
    constructor() {
        this.deviceNotification = null;
        this.onRegister = null;
        this.onNotification = null;
        this.reduxStore = null;

        NotificationsIOS.addEventListener(DEVICE_REMOTE_NOTIFICATIONS_REGISTERED_EVENT, this.onRemoteNotificationsRegistered);
        NotificationsIOS.addEventListener(DEVICE_NOTIFICATION_RECEIVED_FOREGROUND_EVENT, this.onNotificationReceivedForeground);
        NotificationsIOS.addEventListener(DEVICE_NOTIFICATION_OPENED_EVENT, this.onNotificationOpened);
    }

    handleNotification = (data, foreground, userInteraction) => {
        this.deviceNotification = {
            data,
            foreground,
            message: data.body || data.message,
            userInfo: data.userInfo,
            userInteraction,
        };

        if (this.onNotification) {
            this.onNotification(this.deviceNotification);
        }
    };

    configure(options) {
        this.reduxStore = options.reduxStore;
        this.onRegister = options.onRegister;
        this.onNotification = options.onNotification;

        this.requestNotificationReplyPermissions();

        if (options.popInitialNotification) {
            NotificationsIOS.getInitialNotification().
                then((notification) => {
                    if (notification) {
                        const data = notification.getData();
                        if (data) {
                            EphemeralStore.setStartFromNotification(true);
                            this.handleNotification(data, false, true);
                        }
                    }
                }).
                catch((err) => {
                    console.log('iOS getInitialNotifiation() failed', err); //eslint-disable-line no-console
                });
        }
    }

    requestNotificationReplyPermissions = () => {
        const replyCategory = this.createReplyCategory();
        this.requestPermissions([replyCategory]);
    }

    createReplyCategory = () => {
        const {getState} = this.reduxStore;
        const state = getState();
        const locale = getCurrentLocale(state);

        const replyTitle = getLocalizedMessage(locale, t('mobile.push_notification_reply.title'));
        const replyButton = getLocalizedMessage(locale, t('mobile.push_notification_reply.button'));
        const replyPlaceholder = getLocalizedMessage(locale, t('mobile.push_notification_reply.placeholder'));

        const replyAction = new NotificationAction({
            activationMode: 'background',
            title: replyTitle,
            textInput: {
                buttonTitle: replyButton,
                placeholder: replyPlaceholder,
            },
            authenticationRequired: true,
            identifier: REPLY_ACTION,
        });

        return new NotificationCategory({
            identifier: CATEGORY,
            actions: [replyAction],
            context: 'default',
        });
    }

    requestPermissions = (permissions) => {
        NotificationsIOS.requestPermissions(permissions);
    };

    localNotificationSchedule(notification) {
        if (notification.date) {
            const deviceNotification = {
                fireDate: notification.date.toISOString(),
                body: notification.message,
                alertAction: '',
                userInfo: notification.userInfo,
            };

            NotificationsIOS.localNotification(deviceNotification);
        }
    }

    localNotification(notification) {
        this.deviceNotification = {
            body: notification.message,
            alertAction: '',
            userInfo: notification.userInfo,
        };

        NotificationsIOS.localNotification(this.deviceNotification);
    }

    cancelAllLocalNotifications() {
        NotificationsIOS.cancelAllLocalNotifications();
    }

    onNotificationReceivedBackground = (notification) => {
        const userInteraction = AppState.currentState === 'active';

        // mark the app as started as soon as possible
        if (userInteraction) {
            EphemeralStore.setStartFromNotification(true);
        }

        const data = notification.getData();
        const info = {
            ...data,
            message: data.body || notification.getMessage(),
        };

        if (!userInteraction) {
            this.handleNotification(info, false, userInteraction);
        }
    };

    onNotificationReceivedForeground = (notification) => {
        const data = notification.getData();
        const info = {
            ...data,
            message: data.body || notification.getMessage(),
        };
        this.handleNotification(info, true, false);
    };

    onNotificationOpened = (notification, completion) => {
        const data = notification.getData();
        const info = {
            ...data,
            message: data.body || notification.getMessage(),
        };
        this.handleNotification(info, false, true);
        completion();
    };

    onRemoteNotificationsRegistered = (deviceToken) => {
        if (this.onRegister) {
            this.onRegister({token: deviceToken});
        }
    };

    setApplicationIconBadgeNumber(number) {
        const count = number < 0 ? 0 : number;
        NotificationsIOS.setBadgesCount(count);
    }

    getNotification() {
        return this.deviceNotification;
    }

    resetNotification() {
        this.deviceNotification = null;
    }

    getDeliveredNotifications(callback) {
        NotificationsIOS.getDeliveredNotifications(callback);
    }

    clearChannelNotifications(channelId) {
        NotificationsIOS.getDeliveredNotifications((notifications) => {
            const ids = [];
            let badgeCount = notifications.length;

            if (this.reduxStore) {
                const totalMentions = getBadgeCount(this.reduxStore.getState());
                if (totalMentions > -1) {
                    badgeCount = totalMentions;
                }
            }

            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i];

                if (notification.channel_id === channelId) {
                    ids.push(notification.identifier);
                }
            }

            if (ids.length) {
                badgeCount -= ids.length;
                NotificationsIOS.removeDeliveredNotifications(ids);
            }

            this.setApplicationIconBadgeNumber(badgeCount);
        });
    }

    clearNotifications = () => {
        this.setApplicationIconBadgeNumber(0);
        this.cancelAllLocalNotifications(); // TODO: Only cancel the local notifications that belong to this server
    }
}

export default new PushNotification();
