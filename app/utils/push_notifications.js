// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform} from 'react-native';

import PushNotifications from 'app/push_notifications';
import DeviceInfo from 'react-native-device-info';
import {Client4} from 'mattermost-redux/client';

import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {setDeviceToken} from 'mattermost-redux/actions/general';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {ViewTypes} from 'app/constants';
import {
    createPost,
    loadFromPushNotification,
} from 'app/actions/views/root';

import {
    app,
    store,
} from 'app/mattermost';

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

const onPushNotification = async (deviceNotification) => {
    const {dispatch, getState} = store;

    // mark the app as started as soon as possible
    if (Platform.OS === 'android' && !app.appStarted) {
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
        dispatch(markChannelAsRead(data.channel_id, null, false));
    } else if (foreground) {
        EventEmitter.emit(ViewTypes.NOTIFICATION_IN_APP, notification);
    } else if (userInteraction && !notification.localNotification) {
        EventEmitter.emit('close_channel_drawer');
        if (getState().views.root.hydrationComplete) {
            await dispatch(loadFromPushNotification(notification));
            if (!app.startAppFromPushNotification) {
                EventEmitter.emit(ViewTypes.NOTIFICATION_TAPPED);
                PushNotifications.resetNotification();
            }
        }
    }
};

export const onPushNotificationReply = (data, text, badge, completed) => {
    const {dispatch, getState} = store;
    const state = getState();
    const {currentUserId: reduxCurrentUserId} = state.entities.users;
    const reduxCredentialsUrl = state.entities.general.credentials.url;
    const reduxCredentialsToken = state.entities.general.credentials.token;

    const currentUserId = reduxCurrentUserId || app.currentUserId;
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

        createPost(post)(dispatch, getState).then(() => {
            markChannelAsRead(data.channel_id)(dispatch, getState);

            if (badge >= 0) {
                PushNotifications.setApplicationIconBadgeNumber(badge);
            }

            app.setReplyNotificationData(null);
        }).then(completed);
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
