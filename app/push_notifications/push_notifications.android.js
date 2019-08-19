// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, NativeModules} from 'react-native';
import {NotificationsAndroid, PendingNotifications} from 'react-native-notifications';

import ephemeralStore from 'app/store/ephemeral_store';

const {NotificationPreferences} = NativeModules;

class PushNotification {
    constructor() {
        this.onRegister = null;
        this.onNotification = null;
        this.onReply = null;
        this.deviceNotification = null;
        this.deviceToken = null;

        NotificationsAndroid.setRegistrationTokenUpdateListener((deviceToken) => {
            this.deviceToken = deviceToken;
            if (this.onRegister) {
                this.onRegister({token: this.deviceToken});
            }
        });

        NotificationsAndroid.setNotificationReceivedListener((notification) => {
            if (notification) {
                const data = notification.getData();
                this.handleNotification(data, false);
            }
        });

        NotificationsAndroid.setNotificationOpenedListener((notification) => {
            if (notification) {
                const data = notification.getData();
                this.handleNotification(data, true);
            }
        });
    }

    handleNotification = (data, userInteraction) => {
        this.deviceNotification = {
            data,
            foreground: !userInteraction && AppState.currentState === 'active',
            message: data.message,
            userInfo: data.userInfo,
            userInteraction,
        };

        if (this.onNotification) {
            this.onNotification(this.deviceNotification);
        }
    };

    configure(options) {
        this.onRegister = options.onRegister;
        this.onNotification = options.onNotification;
        this.onReply = options.onReply;

        if (this.onRegister && this.deviceToken) {
            this.onRegister({token: this.deviceToken});
        }

        if (options.popInitialNotification) {
            PendingNotifications.getInitialNotification().
                then((notification) => {
                    if (notification) {
                        const data = notification.getData();
                        if (data) {
                            ephemeralStore.appStartedFromPushNotification = true;
                            this.handleNotification(data, true);
                        }
                    }
                }).
                catch((err) => {
                    console.log('Android getInitialNotifiation() failed', err); //eslint-disable-line no-console
                });
        }
    }

    localNotificationSchedule(notification) {
        if (notification.date) {
            notification.fireDate = notification.date.getTime();
            Reflect.deleteProperty(notification, 'date');
            NotificationsAndroid.scheduleLocalNotification(notification);
        }
    }

    localNotification(notification) {
        NotificationsAndroid.localNotification(notification);
    }

    cancelAllLocalNotifications() {
        NotificationsAndroid.cancelAllLocalNotifications();
    }

    setApplicationIconBadgeNumber(number) {
        NotificationsAndroid.setBadgesCount(number);
    }

    getNotification() {
        return this.deviceNotification;
    }

    resetNotification() {
        this.deviceNotification = null;
    }

    async clearChannelNotifications(channelId) {
        const notifications = await NotificationPreferences.getDeliveredNotifications();
        const notificationForChannel = notifications.find((n) => n.channel_id === channelId);
        if (notificationForChannel) {
            NotificationPreferences.removeDeliveredNotifications(notificationForChannel.identifier, channelId);
        }
    }

    clearForegroundNotifications = () => {
        // TODO: Implement as part of https://mattermost.atlassian.net/browse/MM-17110
    };

    clearNotifications = () => {
        this.setApplicationIconBadgeNumber(0);
        this.cancelAllLocalNotifications(); // TODO: Only cancel the local notifications that belong to this server
        this.clearForegroundNotifications(); // TODO: Only clear the foreground notifications that belong to this server
    }
}

export default new PushNotification();
