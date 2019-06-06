// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    AppState,
    Platform,
} from 'react-native';

import DeviceInfo from 'react-native-device-info';

import {setSystemEmojis} from 'mattermost-redux/actions/emojis';
import {Client4} from 'mattermost-redux/client';

import {
    app,
    store,
} from 'app/mattermost';
import PushNotifications from 'app/push_notifications';
import {stripTrailingSlashes} from 'app/utils/url';

import ChannelLoader from 'app/components/channel_loader';
import EmptyToolbar from 'app/components/start/empty_toolbar';
import Loading from 'app/components/loading';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';

const lazyLoadPushNotifications = () => {
    return require('app/utils/push_notifications').configurePushNotifications;
};

const lazyLoadReplyPushNotifications = () => {
    return require('app/utils/push_notifications').onPushNotificationReply;
};

/**
 * Entry Component:
 * With very little overhead navigate to
 *  - Login or
 *  - Channel Component
 *
 * The idea is to render something to the user as soon as possible
 */
export default class Entry extends PureComponent {
    static propTypes = {
        theme: PropTypes.object,
        navigator: PropTypes.object,
        isLandscape: PropTypes.bool,
        enableTimezone: PropTypes.bool,
        deviceTimezone: PropTypes.string,
        actions: PropTypes.shape({
            autoUpdateTimezone: PropTypes.func.isRequired,
            setDeviceToken: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.unsubscribeFromStore = null;
    }

    componentDidMount() {
        Client4.setUserAgent(DeviceInfo.getUserAgent());

        if (store.getState().views.root.hydrationComplete) {
            this.handleHydrationComplete();
        } else {
            this.unsubscribeFromStore = store.subscribe(this.listenForHydration);
        }
    }

    listenForHydration = () => {
        const {getState} = store;
        const state = getState();

        if (!app.isNotificationsConfigured) {
            this.configurePushNotifications();
        }

        if (state.views.root.hydrationComplete) {
            this.handleHydrationComplete();
        }
    };

    handleHydrationComplete = () => {
        if (this.unsubscribeFromStore) {
            this.unsubscribeFromStore();
            this.unsubscribeFromStore = null;
        }

        this.autoUpdateTimezone();
        this.setAppCredentials();
        this.setStartupThemes();
        this.handleNotification();
        this.loadSystemEmojis();

        if (Platform.OS === 'android') {
            this.launchForAndroid();
        } else {
            this.launchForiOS();
        }
    };

    autoUpdateTimezone = () => {
        const {
            actions: {
                autoUpdateTimezone,
            },
            enableTimezone,
            deviceTimezone,
        } = this.props;

        if (enableTimezone) {
            autoUpdateTimezone(deviceTimezone);
        }
    };

    configurePushNotifications = () => {
        const configureNotifications = lazyLoadPushNotifications();
        configureNotifications();
    };

    setAppCredentials = () => {
        const {
            actions: {
                setDeviceToken,
            },
        } = this.props;
        const {getState} = store;
        const state = getState();

        const {credentials} = state.entities.general;
        const {currentUserId} = state.entities.users;

        if (app.deviceToken) {
            setDeviceToken(app.deviceToken);
        }

        if (credentials.token && credentials.url) {
            Client4.setToken(credentials.token);
            Client4.setUrl(stripTrailingSlashes(credentials.url));
        } else if (app.waitForRehydration) {
            app.waitForRehydration = false;
        }

        if (currentUserId) {
            Client4.setUserId(currentUserId);
        }

        app.setAppCredentials(app.deviceToken, currentUserId, credentials.token, credentials.url);
    };

    setStartupThemes = () => {
        const {theme} = this.props;
        if (app.toolbarBackground === theme.sidebarHeaderBg) {
            return;
        }

        app.setStartupThemes(
            theme.sidebarHeaderBg,
            theme.sidebarHeaderTextColor,
            theme.centerChannelBg
        );
    };

    handleNotification = async () => {
        const notification = PushNotifications.getNotification();

        // If notification exists, it means that the app was started through a reply
        // and the app was not sitting in the background nor opened
        if (notification || app.replyNotificationData) {
            const onPushNotificationReply = lazyLoadReplyPushNotifications();
            const notificationData = notification || app.replyNotificationData;
            const {data, text, badge, completed} = notificationData;

            // if the notification has a completed property it means that we are replying to a notification
            if (completed) {
                onPushNotificationReply(data, text, badge, completed);
            }
            PushNotifications.resetNotification();
        }
    };

    launchForAndroid = () => {
        app.launchApp();
    };

    launchForiOS = () => {
        const appNotActive = AppState.currentState !== 'active';

        if (appNotActive) {
            // for iOS replying from push notification starts the app in the background
            app.setShouldRelaunchWhenActive(true);
        } else {
            app.launchApp();
        }
    };

    loadSystemEmojis = () => {
        const EmojiIndicesByAlias = require('app/utils/emojis').EmojiIndicesByAlias;
        setSystemEmojis(EmojiIndicesByAlias);
    };

    render() {
        const {
            navigator,
            isLandscape,
        } = this.props;

        let toolbar = null;
        let loading = null;
        const backgroundColor = app.appBackground ? app.appBackground : '#ffff';
        if (app.token && app.toolbarBackground) {
            const toolbarTheme = {
                sidebarHeaderBg: app.toolbarBackground,
                sidebarHeaderTextColor: app.toolbarTextColor,
            };

            toolbar = (
                <View>
                    <StatusBar headerColor={app.toolbarBackground}/>
                    <EmptyToolbar
                        theme={toolbarTheme}
                        isLandscape={isLandscape}
                    />
                </View>
            );

            loading = (
                <ChannelLoader
                    backgroundColor={backgroundColor}
                    channelIsLoading={true}
                />
            );
        } else {
            loading = <Loading/>;
        }

        return (
            <SafeAreaView
                navBarBackgroundColor={app.toolbarBackground}
                backgroundColor={backgroundColor}
                navigator={navigator}
            >
                {toolbar}
                {loading}
            </SafeAreaView>
        );
    }
}
