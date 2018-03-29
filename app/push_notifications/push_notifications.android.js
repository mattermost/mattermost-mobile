// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AppRegistry, AppState} from 'react-native';
import {NotificationsAndroid, PendingNotifications} from 'react-native-notifications';
import Notification from 'react-native-notifications/notification.android';

class PushNotification {
    constructor() {
        this.onRegister = null;
        this.onNotification = null;
        this.onReply = null;
        this.deviceNotification = null;
        this.deviceToken = null;

        NotificationsAndroid.setRegistrationTokenUpdateListener((deviceToken) => {
            this.deviceToken = deviceToken;
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

        AppRegistry.registerHeadlessTask('notificationReplied', () => async (deviceNotification) => {
            const notification = new Notification(deviceNotification);
            const data = notification.getData();

            if (this.onReply && AppState.currentState === 'background') {
                this.onReply(data, data.text, parseInt(data.badge, 10) - parseInt(data.msg_count, 10));
            } else {
                this.deviceNotification = {
                    data,
                    text: data.text,
                    badge: parseInt(data.badge, 10) - parseInt(data.msg_count, 10),
                };
            }
        });
    }

    handleNotification = (data, userInteraction) => {
        const deviceNotification = {
            data,
            foreground: !userInteraction && AppState.currentState === 'active',
            message: data.message,
            userInfo: data.userInfo,
            userInteraction,
        };

        if (this.onNotification) {
            this.onNotification(deviceNotification);
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
}

export default new PushNotification();
