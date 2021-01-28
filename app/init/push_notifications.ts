// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, NativeModules, Platform} from 'react-native';
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

import {dismissAllModals, popToRoot} from '@actions/navigation';
import {markChannelViewedAndRead, fetchPostActionWithRetry} from '@actions/views/channel';
import {getPosts} from '@actions/views/post';
import {loadFromPushNotification} from '@actions/views/root';
import {logout} from '@actions/views/user';
import {NavigationTypes, ViewTypes} from '@constants';
import {getLocalizedMessage} from '@i18n';
import {setDeviceToken} from '@mm-redux/actions/general';
import {General} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {getCurrentLocale} from '@selectors/i18n';
import {getBadgeCount} from '@selectors/views';
import EphemeralStore from '@store/ephemeral_store';
import Store from '@store/store';
import {waitForHydration} from '@store/utils';
import {t} from '@utils/i18n';

import type {DispatchFunc} from '@mm-redux/types/actions';

const CATEGORY = 'CAN_REPLY';
const REPLY_ACTION = 'REPLY_ACTION';
const AndroidNotificationPreferences = Platform.OS === 'android' ? NativeModules.NotificationPreferences : null;
const NOTIFICATION_TYPE = {
    CLEAR: 'clear',
    MESSAGE: 'message',
    SESSION: 'session',
};

interface NotificationWithChannel extends Notification {
    identifier: string;
    channel_id: string;
}

class PushNotifications {
    configured = false;

    constructor() {
        Notifications.registerRemoteNotifications();
        Notifications.events().registerNotificationOpened(this.onNotificationOpened);
        Notifications.events().registerRemoteNotificationsRegistered(this.onRemoteNotificationsRegistered);
        Notifications.events().registerNotificationReceivedBackground(this.onNotificationReceivedBackground);
        Notifications.events().registerNotificationReceivedForeground(this.onNotificationReceivedForeground);

        this.getInitialNotification();
    }

    cancelAllLocalNotifications() {
        Notifications.cancelAllLocalNotifications();
    }

    clearNotifications = () => {
        this.setApplicationIconBadgeNumber(0, true);

        // TODO: Only cancel the local notifications that belong to this server
        this.cancelAllLocalNotifications();
    };

    clearChannelNotifications = async (channelId: string) => {
        if (Platform.OS === 'android') {
            const notifications = await AndroidNotificationPreferences.getDeliveredNotifications();
            const notificationForChannel = notifications.find((n: NotificationWithChannel) => n.channel_id === channelId);
            if (notificationForChannel) {
                AndroidNotificationPreferences.removeDeliveredNotifications(notificationForChannel.identifier, channelId);
            }
        } else {
            const ids: string[] = [];
            const notifications = await Notifications.ios.getDeliveredNotifications();
            let badgeCount = notifications.length;

            if (Store.redux) {
                const totalMentions = getBadgeCount(Store.redux.getState());
                if (totalMentions > -1) {
                    badgeCount = totalMentions;
                }
            }

            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i] as NotificationWithChannel;
                if (notification.channel_id === channelId) {
                    ids.push(notification.identifier);
                }
            }

            if (ids.length) {
                Notifications.ios.removeDeliveredNotifications(ids);
            }

            this.setApplicationIconBadgeNumber(badgeCount);
        }
    }

    createReplyCategory = () => {
        const {getState} = Store.redux!;
        const state = getState();
        const locale = getCurrentLocale(state);

        const replyTitle = getLocalizedMessage(locale, t('mobile.push_notification_reply.title'));
        const replyButton = getLocalizedMessage(locale, t('mobile.push_notification_reply.button'));
        const replyPlaceholder = getLocalizedMessage(locale, t('mobile.push_notification_reply.placeholder'));
        const replyTextInput: NotificationTextInput = {
            buttonTitle: replyButton,
            placeholder: replyPlaceholder,
        };
        const replyAction = new NotificationAction(REPLY_ACTION, 'background', replyTitle, true, replyTextInput);
        return new NotificationCategory(CATEGORY, [replyAction]);
    }

    getInitialNotification = async () => {
        const notification: NotificationWithData | undefined = await Notifications.getInitialNotification();

        if (notification) {
            EphemeralStore.setStartFromNotification(true);
            notification.userInteraction = true;

            // getInitialNotification may run before the store is set
            // that is why we run on an interval until the store is available
            // once we handle the notification the interval is cleared.
            const interval = setInterval(() => {
                if (Store.redux) {
                    clearInterval(interval);
                    this.handleNotification(notification);
                }
            }, 500);
        }
    }

    handleNotification = (notification: NotificationWithData) => {
        const {payload, foreground, userInteraction} = notification;

        if (Store.redux && payload) {
            const dispatch = Store.redux.dispatch as DispatchFunc;

            waitForHydration(Store.redux, async () => {
                switch (payload.type) {
                case NOTIFICATION_TYPE.CLEAR:
                    dispatch(markChannelViewedAndRead(payload.channel_id, null, false));
                    break;
                case NOTIFICATION_TYPE.MESSAGE:
                    // get the posts for the channel as soon as possible
                    dispatch(fetchPostActionWithRetry(getPosts(payload.channel_id)));

                    if (foreground) {
                        EventEmitter.emit(ViewTypes.NOTIFICATION_IN_APP, notification);
                    } else if (userInteraction && !payload.userInfo?.local) {
                        dispatch(loadFromPushNotification(notification));
                        const componentId = EphemeralStore.getNavigationTopComponentId();
                        if (componentId) {
                            EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
                            EventEmitter.emit(NavigationTypes.CLOSE_SETTINGS_SIDEBAR);

                            await dismissAllModals();
                            await popToRoot();
                        }
                    }
                    break;
                case NOTIFICATION_TYPE.SESSION:
                    // eslint-disable-next-line no-console
                    console.log('Session expired notification');
                    dispatch(logout());
                    break;
                }
            });
        }
    }

    localNotification = (notification: Notification) => {
        Notifications.postLocalNotification(notification);
    }

    onNotificationOpened = (notification: NotificationWithData, completion: () => void) => {
        notification.userInteraction = true;
        this.handleNotification(notification);
        completion();
    }

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
            const {deviceToken} = event;
            let prefix;

            if (Platform.OS === 'ios') {
                prefix = General.PUSH_NOTIFY_APPLE_REACT_NATIVE;
                if (DeviceInfo.getBundleId().includes('rnbeta')) {
                    prefix = `${prefix}beta`;
                }
            } else {
                prefix = General.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
            }

            EphemeralStore.deviceToken = `${prefix}:${deviceToken}`;
            if (Store.redux) {
                this.configured = true;
                const dispatch = Store.redux.dispatch as DispatchFunc;
                waitForHydration(Store.redux, () => {
                    this.requestNotificationReplyPermissions();
                    dispatch(setDeviceToken(EphemeralStore.deviceToken));
                });
            } else {
                // The redux store is not ready, so we retry it to set the
                // token to prevent sessions being registered without a device id
                // This code may be executed on fast devices cause the token registration
                // is faster than the redux store configuration.
                // Note: Should not be needed once WDB is implemented
                const remoteTimeout = setTimeout(() => {
                    clearTimeout(remoteTimeout);
                    this.onRemoteNotificationsRegistered(event);
                }, 200);
            }
        }
    };

    requestNotificationReplyPermissions = () => {
        if (Platform.OS === 'ios') {
            const replyCategory = this.createReplyCategory();
            Notifications.setCategories([replyCategory]);
        }
    };

    setApplicationIconBadgeNumber = async (value: number, force = false) => {
        if (Platform.OS === 'ios') {
            const count = value < 0 ? 0 : value;
            const notifications = await Notifications.ios.getDeliveredNotifications();
            if (count === 0 && (force || notifications.length === 0)) {
                Notifications.ios.setBadgeCount(count);
            }
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
