// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AppState} from 'react-native';
import NotificationsIOS from 'react-native-notifications';

class PushNotification {
    constructor() {
        this.onRegister = null;
        this.onNotification = null;

        NotificationsIOS.addEventListener('notificationReceivedForeground', (notification) => {
            const info = {
                ...notification.getData(),
                message: notification.getMessage()
            };
            this.handleNotification(info, true, false);
        });

        NotificationsIOS.addEventListener('notificationReceivedBackground', (notification) => {
            const info = {
                ...notification.getData(),
                message: notification.getMessage()
            };
            this.handleNotification(info, false, false);
        });

        NotificationsIOS.addEventListener('notificationOpened', (notification) => {
            const info = {
                ...notification.getData(),
                message: notification.getMessage()
            };
            this.handleNotification(info, false, true);
        });
    }

    handleNotification = (data, foreground, userInteraction) => {
        const deviceNotification = {
            data,
            foreground: foreground || (!userInteraction && AppState.currentState === 'active'),
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

        NotificationsIOS.addEventListener('remoteNotificationsRegistered', (deviceToken) => {
            if (this.onRegister) {
                this.onRegister({token: deviceToken});
            }
        });

        if (options.requestPermissions) {
            this.requestPermissions();
        }

        if (options.popInitialNotification) {
            NotificationsIOS.consumeBackgroundQueue();
        }
    }

    requestPermissions = () => {
        NotificationsIOS.requestPermissions();
    };

    localNotificationSchedule(notification) {
        if (notification.date) {
            const deviceNotification = {
                fireDate: notification.date.toISOString(),
                alertBody: notification.message,
                alertAction: '',
                userInfo: notification.userInfo
            };

            NotificationsIOS.localNotification(deviceNotification);
        }
    }

    cancelAllLocalNotifications() {
        NotificationsIOS.cancelAllLocalNotifications();
    }

    setApplicationIconBadgeNumber(number) {
        NotificationsIOS.setBadgesCount(number);
    }
}

export default new PushNotification();
