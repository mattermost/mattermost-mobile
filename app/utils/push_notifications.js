// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {setDeviceToken} from 'mattermost-redux/actions/general';
import {getPosts} from 'mattermost-redux/actions/posts';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {markChannelViewedAndRead, retryGetPostsAction} from 'app/actions/views/channel';
import {
    createPostForNotificationReply,
    loadFromPushNotification,
} from 'app/actions/views/root';
import {ViewTypes} from 'app/constants';
import {DEFAULT_LOCALE, getLocalizedMessage} from 'app/i18n';
import {t} from 'app/utils/i18n';
import {
    app,
    store,
} from 'app/mattermost';
import PushNotifications from 'app/push_notifications';

const onRegisterDevice = (data) => {
    app.setIsNotificationsConfigured(true);
    const state = store.getState();

    let prefix;
    if (Platform.OS === 'ios') {
        prefix = General.PUSH_NOTIFY_APPLE_REACT_NATIVE;
        if (DeviceInfo.getBundleId().includes('rnbeta')) {
            prefix = `${prefix}beta`;
        }
    } else {
        prefix = General.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
    }

    const token = `${prefix}:${data.token}`;
    if (state.views.root.hydrationComplete) {
        app.setDeviceToken(token);
        store.dispatch(setDeviceToken(token));
    } else {
        app.setDeviceToken(token);
    }
};

const loadFromNotification = async (notification) => {
    await store.dispatch(loadFromPushNotification(notification, true));
    if (!app.startAppFromPushNotification) {
        EventEmitter.emit(ViewTypes.NOTIFICATION_TAPPED);
        PushNotifications.resetNotification();
    }
};

const onPushNotification = async (deviceNotification) => {
    const {dispatch, getState} = store;
    let unsubscribeFromStore = null;
    let stopLoadingNotification = false;

    // mark the app as started as soon as possible
    if (!app.appStarted) {
        app.setStartAppFromPushNotification(true);
    }

    const {data, foreground, message, userInfo, userInteraction} = deviceNotification;
    const notification = {
        data,
        message,
    };

    if (userInfo) {
        notification.localNotification = userInfo.localNotification;
    }

    if (data.type === 'clear') {
        dispatch(markChannelViewedAndRead(data.channel_id, null, false));
    } else {
        // get the posts for the channel as soon as possible
        retryGetPostsAction(getPosts(data.channel_id), dispatch, getState);

        if (foreground) {
            EventEmitter.emit(ViewTypes.NOTIFICATION_IN_APP, notification);
        } else if (userInteraction && !notification.localNotification) {
            EventEmitter.emit('close_channel_drawer');
            if (getState().views.root.hydrationComplete) {
                setTimeout(() => {
                    loadFromNotification(notification);
                }, 0);
            } else {
                const waitForHydration = () => {
                    if (getState().views.root.hydrationComplete && !stopLoadingNotification) {
                        stopLoadingNotification = true;
                        unsubscribeFromStore();
                        loadFromNotification(notification);
                    }
                };

                unsubscribeFromStore = store.subscribe(waitForHydration);
            }
        }
    }
};

export const onPushNotificationReply = async (data, text, badge, completed) => {
    const {dispatch, getState} = store;
    const state = getState();
    const reduxCurrentUser = getCurrentUser(state);
    const reduxCredentialsUrl = state.entities.general.credentials.url;
    const reduxCredentialsToken = state.entities.general.credentials.token;

    const currentUserId = reduxCurrentUser ? reduxCurrentUser.id : app.currentUserId;
    const url = reduxCredentialsUrl || app.url;
    const token = reduxCredentialsToken || app.token;

    if (currentUserId) {
        // one thing to note is that for android it will reply to the last post in the stack
        const rootId = data.root_id || data.post_id;
        const post = {
            user_id: currentUserId,
            channel_id: data.channel_id,
            root_id: rootId,
            parent_id: rootId,
            message: text,
        };

        if (!Client4.getUrl()) {
            // Make sure the Client has the server url set
            Client4.setUrl(url);
        }

        if (!Client4.getToken()) {
            // Make sure the Client has the server token set
            Client4.setToken(token);
        }

        retryGetPostsAction(getPosts(data.channel_id), dispatch, getState);
        const result = await dispatch(createPostForNotificationReply(post));
        if (result.error) {
            const locale = reduxCurrentUser ? reduxCurrentUser.locale : DEFAULT_LOCALE;
            PushNotifications.localNotification({
                message: getLocalizedMessage(locale, t('mobile.reply_post.failed')),
                userInfo: {
                    localNotification: true,
                    localTest: true,
                },
            });
            console.warn('Failed to send reply to push notification', result.error); // eslint-disable-line no-console
            completed();
            return;
        }

        if (badge >= 0) {
            PushNotifications.setApplicationIconBadgeNumber(badge);
        }

        dispatch(markChannelViewedAndRead(data.channel_id));
        app.setReplyNotificationData(null);
        completed();
    } else {
        app.setReplyNotificationData({
            data,
            text,
            badge,
            completed,
        });
    }
};

export const configurePushNotifications = () => {
    PushNotifications.configure({
        onRegister: onRegisterDevice,
        onNotification: onPushNotification,
        onReply: onPushNotificationReply,
        popInitialNotification: true,
        requestPermissions: true,
    });

    if (app) {
        app.setIsNotificationsConfigured(true);
    }
};
