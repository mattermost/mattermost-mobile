// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
    AppState,
    Platform,
    NativeModules
} from 'react-native';
const {StartTime} = NativeModules;

import {Navigation, NativeEventsReceiver} from 'react-native-navigation';
import StatusBar from 'app/components/status_bar';

import DeviceInfo from 'react-native-device-info';
import {Client4} from 'mattermost-redux/client';
import {store} from 'app/mattermost';

import {stripTrailingSlashes} from 'app/utils/url';
import {loadMe} from 'mattermost-redux/actions/users';

import {isLandscape} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import EmptyToolbar from 'app/components/start/empty_toolbar';
import Loading from 'app/components/loading';

import ChannelNavBar from 'app/screens/channel/channel_nav_bar';

import {makeStyleSheetFromTheme} from 'app/utils/theme';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';


// Channel related imports
const lazyImportsForChannel = () => {
    // import ChannelDrawer from 'app/components/channel_drawer';
    // import SettingsDrawer from 'app/components/settings_drawer';
    // import ChannelLoader from 'app/components/channel_loader';
    // import KeyboardLayout from 'app/components/layout/keyboard_layout';
    // import SafeAreaView from 'app/components/safe_area_view';
    // import OfflineIndicator from 'app/components/offline_indicator';
    // import ChannelPostList from 'app/screens/channel/channel_post_list';
    // import PostTextbox from 'app/components/post_textbox';
    // import ClientUpgradeListener from 'app/components/client_upgrade_listener';
    // import LocalConfig from 'assets/config';

    const ChannelDrawer = require('app/components/channel_drawer').default;
    const SettingsDrawer = require('app/components/settings_drawer').default;
    const ChannelLoader = require('app/components/channel_loader').default;
    const KeyboardLayout = require('app/components/layout/keyboard_layout').default;
    const SafeAreaView = require('app/components/safe_area_view').default;
    const OfflineIndicator = require('app/components/offline_indicator').default;
    const ChannelPostList = require('app/screens/channel/channel_post_list').default;
    const PostTextbox = require('app/components/post_textbox').default;
    const ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
    const PostListRetry = require('app/components/post_list_retry').default;
    const LocalConfig = require('assets/config');

    return {
        ChannelDrawer,
        SettingsDrawer,
        ChannelLoader,
        KeyboardLayout,
        SafeAreaView,
        OfflineIndicator,
        ChannelPostList,
        PostTextbox,
        ClientUpgradeListener,
        PostListRetry,
        LocalConfig
    };

};

const lazyImportsForSecurity = () => {
    const mattermostManaged = require('app/mattermost_managed');
    const LocalConfig = require('assets/config');
    const handleServerUrlChanged = require('app/actions/views/select_server').handleServerUrlChanged;
    const handleLoginIdChanged = require('app/actions/views/login').handleLoginIdChanged;

    return {
        LocalConfig,
        mattermostManaged,
        handleServerUrlChanged,
        handleLoginIdChanged
    };
};

export default class Start extends PureComponent {
    constructor(props) {
        super(props);

        // Declare variables
        this.isConfigured = false;
        this.allowOtherServers = true;
        this.startAppFromPushNotification = false;
        this.emmEnabled = false;

        this.state = {
            launchChannel: false,
        }
    }

    componentDidMount() {
        // Initialize Client
        // StartTime.sinceLaunch('Start.didMount');
        StartTime.initStartTimes();
        StartTime.traceStop();
        console.log('initialize!', store);
        Client4.setUserAgent(DeviceInfo.getUserAgent());
        this.unsubscribeFromStore = store.subscribe(this.listenForHydration);

        // Initialize listeners

        /**
         * TODO: Later initialize
         * Orientation
         * Sentry
         * ExceptionHandler
         *
         * Maybe add them after Navigation navigate to Start
         * or, add them after Channel has been rendered
         */
    }

    componentWillUnmount() {
        // Unsubscribe
    }

    listenForHydration = () => {
        StartTime.sinceLaunch('Start.listenForHydration');
        console.log('listenForHydration', store);
        const {dispatch, getState} = store;
        const state = getState();

        if (!this.isConfigured) {
            // this.configurePushNotifications();
        }

        /**
         * HOLD list:
         * push notification
         * actions
         *  - setDeviceToken
         *
         *  orientation
         */

        console.log('state.views.root.hydrationComplete', state.views.root.hydrationComplete);
        if (state.views.root.hydrationComplete) {
            // const orientation = Orientation.getInitialOrientation();

            const {credentials, config} = state.entities.general;
            const {currentUserId} = state.entities.users;
            const isNotActive = AppState.currentState !== 'active';
            // const notification = PushNotifications.getNotification();

            this.unsubscribeFromStore();

            // actions in redux only call
            if (this.deviceToken) {
                // If the deviceToken is set we need to dispatch it to the redux store
                // setDeviceToken(this.deviceToken)(dispatch, getState);
            }

            // if (orientation) {
            //     this.orientationDidChange(orientation);
            // }

            // if (config) {
            //     this.configureAnalytics(config);
            // }

            console.log('credentials', credentials);

            if (credentials.token && credentials.url) {
                Client4.setToken(credentials.token);
                Client4.setUrl(stripTrailingSlashes(credentials.url));
            }

            if (currentUserId) {
                Client4.setUserId(currentUserId);
            }

            console.log('set Client4 complete');

            // if (Platform.OS === 'ios') {
            //     StatusBarManager.getHeight(
            //         (data) => {
            //             this.handleStatusBarHeightChange(data.height);
            //         }
            //     );
            // }


            // if (notification || this.replyNotificationData) {
            //     // If we have a notification means that the app was started cause of a reply
            //     // and the app was not sitting in the background nor opened
            //     const notificationData = notification || this.replyNotificationData;
            //     const {data, text, badge, completed} = notificationData;
            //     this.onPushNotificationReply(data, text, badge, completed);
            //     PushNotifications.resetNotification();
            // }

            if (Platform.OS === 'android') {
                // In case of Android we need to handle the bridge being initialized by HeadlessJS
                Promise.resolve(Navigation.isAppLaunched()).then((appLaunched) => {
                    console.log('appLaunched', appLaunched);
                    if (this.startAppFromPushNotification) {
                        return;
                    }

                    if (appLaunched) {
                        this.launchApp(); // App is launched -> show UI
                    }

                    new NativeEventsReceiver().appLaunched(() => {
                        this.appStarted = false;
                        this.launchApp();
                    });
                });
            } else if (isNotActive) {
                // for IOS replying from push notification starts the app in the background
                this.shouldRelaunchWhenActive = true;
                this.startFakeApp();
            } else {
                this.launchApp();
            }
        }
    };

    handleManagedConfig = async (serverConfig) => {
        const {
            LocalConfig,
            mattermostManaged,
            handleServerUrlChanged,
            handleLoginIdChanged,
        } = lazyImportsForSecurity();
        const {dispatch, getState} = store;
        const state = getState();

        let authNeeded = false;
        let blurApplicationScreen = false;
        let jailbreakProtection = false;
        let vendor = null;
        let serverUrl = null;
        let username = null;

        if (LocalConfig.AutoSelectServerUrl) {
            handleServerUrlChanged(LocalConfig.DefaultServerUrl)(dispatch, getState);
            this.allowOtherServers = false;
        }

        try {
            const config = await mattermostManaged.getConfig();
            if (config && Object.keys(config).length) {
                this.emmEnabled = true;
                authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
                blurApplicationScreen = config.blurApplicationScreen && config.blurApplicationScreen === 'true';
                jailbreakProtection = config.jailbreakProtection && config.jailbreakProtection === 'true';
                vendor = config.vendor || 'Mattermost';

                if (!state.entities.general.credentials.token) {
                    serverUrl = config.serverUrl;
                    username = config.username;

                    if (config.allowOtherServers && config.allowOtherServers === 'false') {
                        this.allowOtherServers = false;
                    }
                }

                if (jailbreakProtection) {
                    const isTrusted = mattermostManaged.isTrustedDevice();

                    if (!isTrusted) {
                        const intl = this.getIntl();
                        Alert.alert(
                            intl.formatMessage({
                                id: 'mobile.managed.blocked_by',
                                defaultMessage: 'Blocked by {vendor}'
                            }, {vendor}),
                            intl.formatMessage({
                                id: 'mobile.managed.jailbreak',
                                defaultMessage: 'Jailbroken devices are not trusted by {vendor}, please exit the app.'
                            }, {vendor}),
                            [{
                                text: intl.formatMessage({id: 'mobile.managed.exit', defaultMessage: 'Exit'}),
                                style: 'destructive',
                                onPress: () => {
                                    mattermostManaged.quitApp();
                                }
                            }],
                            {cancelable: false}
                        );
                        return false;
                    }
                }

                if (authNeeded && !serverConfig) {
                    if (Platform.OS === 'android') {
                        //Start a fake app as we need at least one activity for android
                        await this.startFakeApp();
                    }
                    const authenticated = await this.handleAuthentication(vendor);
                    if (!authenticated) {
                        return false;
                    }
                }

                if (blurApplicationScreen) {
                    mattermostManaged.blurAppScreen(true);
                }

                if (serverUrl) {
                    handleServerUrlChanged(serverUrl)(dispatch, getState);
                }

                if (username) {
                    handleLoginIdChanged(username)(dispatch, getState);
                }
            }
        } catch (error) {
            return true;
        }

        return true;
    };

    launchApp = () => {
        console.log('launchApp');
        this.handleManagedConfig().then((shouldStart) => {
            if (shouldStart) {
                this.props.actions.loadMe();
                if (this.props.currentTeamId) {
                    this.loadChannels(this.props.currentTeamId);
                } else {
                    this.props.actions.selectFirstAvailableTeam();
                }

                this.setState({launchChannel: true});
            }



            console.log('handleManagedConfig', shouldStart);
            // if (shouldStart) {
            //     this.startApp('fade');
            // }
        });
    };

    startApp = (animationType = 'fade') => {
        console.log('startApp');

        // TODO: Simple goal, load what's needed only channel.
        // TODO: lets assume everything went as planned

        // TODO: this should be converted with state logic
        if (!this.appStarted) {
            const {dispatch, getState} = store;
            const {entities} = getState();
            let screen = 'SelectServer';

            if (entities) {
                const {credentials} = entities.general;

                if (credentials.token && credentials.url) {
                    screen = 'Channel';
                    // tracker.initialLoad = Date.now();
                    loadMe()(dispatch, getState);
                }
            }
            console.log('Screen...', screen);

            Navigation.startSingleScreenApp({
                screen: {
                    screen,
                    navigatorStyle: {
                        navBarHidden: true,
                        statusBarHidden: false,
                        statusBarHideWithNavBar: false,
                        screenBackgroundColor: 'transparent'
                    }
                },
                passProps: {
                    allowOtherServers: this.allowOtherServers
                },
                appStyle: {
                    orientation: 'auto'
                },
                animationType
            });

            this.appStarted = true;
            this.startAppFromPushNotification = false;
        }
    };

    openChannelDrawer = () => {
        if (this.channelDrawer) {
            this.channelDrawer.openChannelDrawer();
        }
    };

    openSettingsDrawer = () => {
        if (this.settingsDrawer) {
            this.settingsDrawer.openSettingsDrawer();
        }
    };

    attachPostTextbox = (ref) => {
        this.postTextbox = ref;
    };

    blurPostTextBox = () => {
        this.postTextbox.getWrappedInstance().blur();
    };

    channelDrawerRef = (ref) => {
        if (ref) {
            this.channelDrawer = ref.getWrappedInstance();
        }
    };

    settingsDrawerRef = (ref) => {
        if (ref) {
            this.settingsDrawer = ref.getWrappedInstance();
        }
    };

    goToChannelInfo = wrapWithPreventDoubleTap(() => {
        console.log('goToChannelInfo, debug why it crashes');
        // const {navigator, theme} = this.props;
        // const {intl} = this.context;
        // console.log('goToChannelInfo');
        // const options = {
        //     screen: 'ChannelInfo',
        //     title: intl.formatMessage({id: 'mobile.routes.channelInfo', defaultMessage: 'Info'}),
        //     animated: true,
        //     backButtonTitle: '',
        //     navigatorStyle: {
        //         navBarTextColor: theme.sidebarHeaderTextColor,
        //         navBarBackgroundColor: theme.sidebarHeaderBg,
        //         navBarButtonColor: theme.sidebarHeaderTextColor,
        //         screenBackgroundColor: theme.centerChannelBg
        //     }
        // };
        //
        // if (Platform.OS === 'android') {
        //     navigator.showModal(options);
        // } else {
        //     navigator.push(options);
        // }
    });

    renderToolbar = () => {
        const state = store.getState();

        if (this.state.launchChannel) {
            return null;
        }

        return (
            <EmptyToolbar
                isLandscape={isLandscape(state)}
                theme={getTheme(state)}
            />
        );
    };

    retryLoadChannels = () => {
        this.loadChannels(this.props.currentTeamId);
    };

    loadChannels = (teamId) => {
        console.log('loadChannels');
        const {
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel
        } = this.props.actions;

        loadChannelsIfNecessary(teamId).then(() => {
            loadProfilesAndTeamMembersForDMSidebar(teamId);
            return selectInitialChannel(teamId);
        }).catch(() => {
            return selectInitialChannel(teamId);
        });
    };

    renderChannel = () => {
        const {
            ChannelDrawer,
            SettingsDrawer,
            ChannelLoader,
            KeyboardLayout,
            SafeAreaView,
            OfflineIndicator,
            ChannelPostList,
            PostTextbox,
            ClientUpgradeListener,
            PostListRetry,
            LocalConfig
        } = lazyImportsForChannel();

        const {
            channelsRequestFailed,
            currentChannelId,
            navigator,
            // theme
        } = this.props;

        const {intl} = this.context;

        const state = store.getState();
        const theme = getTheme(state);

        const style = getStyleFromTheme(theme);

        if (!currentChannelId) {
            if (channelsRequestFailed) {
                console.log('retryLoadChannels');
                return (
                    <PostListRetry
                        retry={this.retryLoadChannels}
                        theme={theme}
                    />
                );
            }
            return (
                <View style={style.loading}>
                    <Loading/>
                </View>
            );
        }

        return (
            <ChannelDrawer
                ref={this.channelDrawerRef}
                blurPostTextBox={this.blurPostTextBox}
                intl={intl}
                navigator={navigator}
            >
                <SettingsDrawer
                    ref={this.settingsDrawerRef}
                    blurPostTextBox={this.blurPostTextBox}
                    navigator={navigator}
                >
                    <SafeAreaView navigator={navigator}>
                        <StatusBar/>
                        <OfflineIndicator/>
                        <ChannelNavBar
                            navigator={navigator}
                            openChannelDrawer={this.openChannelDrawer}
                            openSettingsDrawer={this.openSettingsDrawer}
                            onPress={this.goToChannelInfo}
                        />
                        <KeyboardLayout>
                            <View style={style.postList}>
                                <ChannelPostList navigator={navigator}/>
                            </View>
                            <PostTextbox
                                ref={this.attachPostTextbox}
                                navigator={navigator}
                            />
                            <ChannelLoader theme={theme}/>
                        </KeyboardLayout>
                        {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener navigator={navigator}/>}
                    </SafeAreaView>
                </SettingsDrawer>
            </ChannelDrawer>
        );
    };

    renderBody = () => {
        if (this.state.launchChannel) {
            return this.renderChannel();
        }

        return (
            <Loading/>
        );
    };

    render() {
        return (
            <View style={{flex:1}}>
                {this.renderToolbar()}
                {this.renderBody()}
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        postList: {
            flex: 1
        },
        loading: {
            backgroundColor: theme.centerChannelBg,
            flex: 1
        }
    };
});
