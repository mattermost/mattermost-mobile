// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {markChannelViewedAndRead, fetchPostActionWithRetry} from '@actions/views/channel';
import {dismissAllModals, popToRoot} from '@actions/navigation';
import {getPosts} from '@actions/views/post';
import {
    createPostForNotificationReply,
    loadFromPushNotification,
} from '@actions/views/root';
import {logout} from '@actions/views/user';
import {NavigationTypes, ViewTypes} from '@constants';
import {getLocalizedMessage} from '@i18n';
import {getCurrentServerUrl, getAppCredentials} from '@init/credentials';
import {setDeviceToken} from '@mm-redux/actions/general';
import {Client4} from '@mm-redux/client';
import {General} from '@mm-redux/constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {getCurrentLocale} from '@selectors/i18n';
import EphemeralStore from '@store/ephemeral_store';
import Store from '@store/store';
import {waitForHydration} from '@store/utils';
import {t} from '@utils/i18n';

import PushNotifications from 'app/push_notifications';

const NOTIFICATION_TYPE = {
    CLEAR: 'clear',
    MESSAGE: 'message',
    SESSION: 'session',
};

class PushNotificationUtils {
    constructor() {
        this.configured = false;
        this.replyNotificationData = null;
    }

    configure = async () => {
        return PushNotifications.configure({
            onRegister: this.onRegisterDevice,
            onNotification: this.onPushNotification,
            onReply: this.onPushNotificationReply,
            popInitialNotification: true,
            requestPermissions: true,
        });
    };

    loadFromNotification = async (notification) => {
        await Store.redux.dispatch(loadFromPushNotification(notification));

        // if we have a componentId means that the app is already initialized
        const componentId = EphemeralStore.getNavigationTopComponentId();
        if (componentId) {
            EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
            EventEmitter.emit(NavigationTypes.CLOSE_SETTINGS_SIDEBAR);

            await dismissAllModals();
            await popToRoot();

            PushNotifications.resetNotification();
        }
    };

    onPushNotification = async (deviceNotification) => {
        const {dispatch} = Store.redux;
        const {data, foreground, message, userInteraction} = deviceNotification;
        const notification = {
            data,
            message,
        };

        waitForHydration(Store.redux, () => {
            switch (data.type) {
            case NOTIFICATION_TYPE.CLEAR:
                dispatch(markChannelViewedAndRead(data.channel_id, null, false));
                break;
            case NOTIFICATION_TYPE.MESSAGE:
                // get the posts for the channel as soon as possible
                dispatch(fetchPostActionWithRetry(getPosts(data.channel_id)));

                if (foreground) {
                    EventEmitter.emit(ViewTypes.NOTIFICATION_IN_APP, notification);
                } else if (userInteraction && !notification?.data?.localNotification) {
                    this.loadFromNotification(notification);
                }
                break;
            case NOTIFICATION_TYPE.SESSION:
                // eslint-disable-next-line no-console
                console.log('Session expired notification');
                dispatch(logout());
                break;
            }
        });
    };

    onPushNotificationReply = async (data, text, completion) => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const credentials = await getAppCredentials(); // TODO Change to handle multiple servers
        const url = await getCurrentServerUrl(); // TODO Change to handle multiple servers
        const token = credentials.password;
        const usernameParsed = credentials.username.split(',');
        const [, currentUserId] = usernameParsed;

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

            dispatch(fetchPostActionWithRetry(getPosts(data.channel_id)));
            const result = await dispatch(createPostForNotificationReply(post));
            if (result.error) {
                const locale = getCurrentLocale(state);
                PushNotifications.localNotification({
                    message: getLocalizedMessage(locale, t('mobile.reply_post.failed')),
                    userInfo: {
                        localNotification: true,
                        localTest: true,
                        channel_id: data.channel_id,
                    },
                });
                completion();
                return;
            }

            this.replyNotificationData = null;

            PushNotifications.getDeliveredNotifications((notifications) => {
                PushNotifications.setApplicationIconBadgeNumber(notifications.length);
                completion();
            });
        } else {
            this.replyNotificationData = {
                data,
                text,
                completion,
            };
        }
    };

    onRegisterDevice = (data) => {
        const {dispatch} = Store.redux;

        let prefix;
        if (Platform.OS === 'ios') {
            prefix = General.PUSH_NOTIFY_APPLE_REACT_NATIVE;
            if (DeviceInfo.getBundleId().includes('rnbeta')) {
                prefix = `${prefix}beta`;
            }
        } else {
            prefix = General.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
        }

        EphemeralStore.deviceToken = `${prefix}:${data.token}`;

        // TODO: Remove when realm is ready
        waitForHydration(Store.redux, () => {
            this.configured = true;
            dispatch(setDeviceToken(EphemeralStore.deviceToken));
        });
    };

    getNotification = () => {
        return PushNotifications.getNotification();
    };
}

export default new PushNotificationUtils();