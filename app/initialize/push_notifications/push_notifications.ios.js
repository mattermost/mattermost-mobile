// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AppState} from 'react-native';
import NotificationsIOS, {NotificationAction, NotificationCategory} from 'react-native-notifications';

const CATEGORY = 'CAN_REPLY';
const REPLY_ACTION = 'REPLY_ACTION';

let replyCategory;
const replies = new Set();

class PushNotification {
    constructor() {
        this.onRegister = null;
        this.onNotification = null;
        this.onReply = null;

        NotificationsIOS.addEventListener('notificationReceivedForeground', (notification) => {
            const info = {
                ...notification.getData(),
                message: notification.getMessage(),
            };
            this.handleNotification(info, true, false);
        });

        NotificationsIOS.addEventListener('notificationReceivedBackground', (notification) => {
            const info = {
                ...notification.getData(),
                message: notification.getMessage(),
            };
            this.handleNotification(info, false, false);
        });

        NotificationsIOS.addEventListener('notificationOpened', (notification) => {
            const info = {
                ...notification.getData(),
                message: notification.getMessage(),
            };
            this.handleNotification(info, false, true);
        });

        const replyAction = new NotificationAction({
            activationMode: 'background',
            title: 'Reply',
            behavior: 'textInput',
            authenticationRequired: true,
            identifier: REPLY_ACTION,
        }, this.handleReply);

        replyCategory = new NotificationCategory({
            identifier: CATEGORY,
            actions: [replyAction],
            context: 'default',
        });
    }

    handleNotification = (data, foreground, userInteraction) => {
        const deviceNotification = {
            data,
            foreground: foreground || (!userInteraction && AppState.currentState === 'active'),
            message: data.message,
            userInfo: data.userInfo,
            userInteraction,
        };

        if (this.onNotification) {
            this.onNotification(deviceNotification);
        }
    };

    handleReply = (action, completed) => {
        if (action.identifier === REPLY_ACTION) {
            const data = action.notification.getData();
            const text = action.text;
            const badge = parseInt(action.notification._badge, 10) - 1; //eslint-disable-line no-underscore-dangle

            if (this.onReply && !replies.has(action.completionKey)) {
                replies.add(action.completionKey);
                this.onReply(data, text, badge, completed);
            }
        } else {
            completed();
        }
    };

    configure(options) {
        this.onRegister = options.onRegister;
        this.onNotification = options.onNotification;
        this.onReply = options.onReply;

        NotificationsIOS.addEventListener('remoteNotificationsRegistered', (deviceToken) => {
            if (this.onRegister) {
                this.onRegister({token: deviceToken});
            }
        });

        if (options.requestPermissions) {
            this.requestPermissions([replyCategory]);
        }

        if (options.popInitialNotification) {
            NotificationsIOS.consumeBackgroundQueue();
        }
    }

    requestPermissions = (permissions) => {
        NotificationsIOS.requestPermissions(permissions);
    };

    localNotificationSchedule(notification) {
        if (notification.date) {
            const deviceNotification = {
                fireDate: notification.date.toISOString(),
                alertBody: notification.message,
                alertAction: '',
                userInfo: notification.userInfo,
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

    getNotification() {
        return null;
    }

    resetNotification() {
        this.deviceNotification = null;
    }
}

export default new PushNotification();
