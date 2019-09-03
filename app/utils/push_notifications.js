// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {setDeviceToken} from 'mattermost-redux/actions/general';
import {getPosts} from 'mattermost-redux/actions/posts';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {markChannelViewedAndRead, retryGetPostsAction} from 'app/actions/views/channel';
import {
    createPostForNotificationReply,
    loadFromPushNotification,
} from 'app/actions/views/root';
import {dismissAllModals, popToRoot} from 'app/actions/navigation';
import {ViewTypes} from 'app/constants';
import {getLocalizedMessage} from 'app/i18n';
import {getCurrentServerUrl, getAppCredentials} from 'app/init/credentials';
import PushNotifications from 'app/push_notifications';
import {getCurrentLocale} from 'app/selectors/i18n';
import EphemeralStore from 'app/store/ephemeral_store';
import {t} from 'app/utils/i18n';

class PushNotificationUtils {
    constructor() {
        this.configured = false;
        this.replyNotificationData = null;
    }

    configure = (store) => {
        this.store = store;

        PushNotifications.configure({
            onRegister: this.onRegisterDevice,
            onNotification: this.onPushNotification,
            onReply: this.onPushNotificationReply,
            popInitialNotification: true,
            requestPermissions: true,
        });
    };

    loadFromNotification = async (notification) => {
        // Set appStartedFromPushNotification to avoid channel screen to call selectInitialChannel
        EphemeralStore.appStartedFromPushNotification = true;
        await this.store.dispatch(loadFromPushNotification(notification, true));

        // if we have a componentId means that the app is already initialized
        const componentId = EphemeralStore.getNavigationTopComponentId();
        if (componentId) {
            EventEmitter.emit('close_channel_drawer');
            EventEmitter.emit('close_settings_sidebar');

            const {dispatch} = this.store;
            dispatch(dismissAllModals());
            dispatch(popToRoot());

            PushNotifications.resetNotification();
        }
    };

    onPushNotification = async (deviceNotification) => {
        const {dispatch, getState} = this.store;
        let unsubscribeFromStore = null;
        let stopLoadingNotification = false;

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
                if (getState().views.root.hydrationComplete) { //TODO: Replace when realm is ready
                    setTimeout(() => {
                        this.loadFromNotification(notification);
                    }, 0);
                } else {
                    const waitForHydration = () => {
                        if (getState().views.root.hydrationComplete && !stopLoadingNotification) {
                            stopLoadingNotification = true;
                            unsubscribeFromStore();
                            this.loadFromNotification(notification);
                        }
                    };

                    unsubscribeFromStore = this.store.subscribe(waitForHydration);
                }
            }
        }
    };

    onPushNotificationReply = async (data, text, badge, completed) => {
        const {dispatch, getState} = this.store;
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

            retryGetPostsAction(getPosts(data.channel_id), dispatch, getState);
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
                completed();
                return;
            }

            if (badge >= 0) {
                PushNotifications.setApplicationIconBadgeNumber(badge);
            }

            dispatch(markChannelViewedAndRead(data.channel_id));
            this.replyNotificationData = null;
            completed();
        } else {
            this.replyNotificationData = {
                data,
                text,
                badge,
                completed,
            };
        }
    };

    onRegisterDevice = (data) => {
        const {dispatch, getState} = this.store;
        let unsubscribeFromStore = null;

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
        const waitForHydration = () => {
            if (getState().views.root.hydrationComplete && !this.configured) {
                this.configured = true;
                dispatch(setDeviceToken(EphemeralStore.deviceToken));
                unsubscribeFromStore();
            }
        };

        unsubscribeFromStore = this.store.subscribe(waitForHydration);
    };

    getNotification = () => {
        return PushNotifications.getNotification();
    };
}

export default new PushNotificationUtils();
