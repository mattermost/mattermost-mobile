// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AppState} from 'react-native';
import {NotificationsAndroid, PendingNotifications} from 'react-native-notifications';

class PushNotification {
    constructor() {
        this.onRegister = null;
        this.onNotification = null;

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
        const deviceNotification = {
            data,
            foreground: !userInteraction && AppState.currentState === 'active',
            message: data.message,
            userInfo: data.userInfo,
            userInteraction
        };

        if (this.onNotification) {
            this.onNotification(deviceNotification);
        }
    };

    configure(options) {
        this.onRegister = options.onRegister;
        this.onNotification = options.onNotification;

        NotificationsAndroid.refreshToken();
        NotificationsAndroid.setRegistrationTokenUpdateListener((deviceToken) => {
            if (this.onRegister) {
                this.onRegister({token: deviceToken});
            }
        });

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

    cancelAllLocalNotifications() {
        NotificationsAndroid.cancelAllLocalNotifications();
    }

    setApplicationIconBadgeNumber(number) {
        NotificationsAndroid.setBadgesCount(number);
    }
}

export default new PushNotification();
