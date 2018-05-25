// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    AppState,
    Platform,
} from 'react-native';

import DeviceInfo from 'react-native-device-info';

import {Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {
    app,
    store,
} from 'app/mattermost';
import {loadFromPushNotification} from 'app/actions/views/root';
import {ViewTypes} from 'app/constants';
import PushNotifications from 'app/push_notifications';
import {stripTrailingSlashes} from 'app/utils/url';
import {wrapWithContextProvider} from 'app/utils/wrap_context_provider';

import ChannelLoader from 'app/components/channel_loader';
import EmptyToolbar from 'app/components/start/empty_toolbar';
import Loading from 'app/components/loading';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';

const lazyLoadSelectServer = () => {
    return require('app/screens/select_server').default;
};

const lazyLoadChannel = () => {
    return require('app/screens/channel').default;
};

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
        config: PropTypes.object,
        theme: PropTypes.object,
        navigator: PropTypes.object,
        isLandscape: PropTypes.bool,
        hydrationComplete: PropTypes.bool,
        initializeModules: PropTypes.func.isRequired,
        actions: PropTypes.shape({
            setDeviceToken: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            launchLogin: false,
            launchChannel: false,
        };
    }

    componentDidMount() {
        Client4.setUserAgent(DeviceInfo.getUserAgent());
        this.unsubscribeFromStore = store.subscribe(this.listenForHydration);

        EventEmitter.on(ViewTypes.LAUNCH_LOGIN, this.handleLaunchLogin);
        EventEmitter.on(ViewTypes.LAUNCH_CHANNEL, this.handleLaunchChannel);
    }

    componentWillUnmount() {
        EventEmitter.off(ViewTypes.LAUNCH_LOGIN, this.handleLaunchLogin);
        EventEmitter.off(ViewTypes.LAUNCH_CHANNEL, this.handleLaunchChannel);
    }

    handleLaunchLogin = (initializeModules) => {
        this.setState({launchLogin: true});

        if (initializeModules) {
            this.props.initializeModules();
        }
    };

    handleLaunchChannel = (initializeModules) => {
        this.setState({launchChannel: true});

        if (initializeModules) {
            this.props.initializeModules();
        }
    };

    listenForHydration = () => {
        const {getState} = store;
        const state = getState();

        if (!app.isNotificationsConfigured) {
            this.configurePushNotifications();
        }

        if (state.views.root.hydrationComplete) {
            this.unsubscribeFromStore();

            this.setAppCredentials();
            this.setStartupThemes();
            this.handleNotification();

            if (Platform.OS === 'android') {
                this.launchForAndroid();
                return;
            }

            this.launchForiOS();
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
            // and in case it doesn't it means we just opened the notification
            if (completed) {
                onPushNotificationReply(data, text, badge, completed);
            } else {
                await store.dispatch(loadFromPushNotification(notification));
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

    renderLogin = () => {
        const SelectServer = lazyLoadSelectServer();
        const props = {
            allowOtherServers: app.allowOtherServers,
            navigator: this.props.navigator,
        };

        return wrapWithContextProvider(SelectServer)(props);
    };

    renderChannel = () => {
        const ChannelScreen = lazyLoadChannel();
        const props = {
            navigator: this.props.navigator,
        };

        return wrapWithContextProvider(ChannelScreen, true)(props);
    };

    render() {
        const {
            navigator,
            isLandscape,
        } = this.props;

        if (this.state.launchLogin) {
            return this.renderLogin();
        }

        if (this.state.launchChannel) {
            return this.renderChannel();
        }

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
