// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    AppState,
    Dimensions,
    Platform,
    View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import EmptyToolbar from 'app/components/start/empty_toolbar';
import ChannelLoader from 'app/components/channel_loader';
import MainSidebar from 'app/components/sidebars/main';
import SettingsSidebar from 'app/components/sidebars/settings';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import OfflineIndicator from 'app/components/offline_indicator';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {ViewTypes} from 'app/constants';
import mattermostBucket from 'app/mattermost_bucket';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import PostTextbox from 'app/components/post_textbox';
import networkConnectionListener from 'app/utils/network';
import tracker from 'app/utils/time_tracker';
import LocalConfig from 'assets/config';

import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    IOSX_TOP_PORTRAIT,
} = ViewTypes;

let ClientUpgradeListener;

export default class Channel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            connection: PropTypes.func.isRequired,
            loadChannelsIfNecessary: PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: PropTypes.func.isRequired,
            logout: PropTypes.func.isRequired,
            selectDefaultTeam: PropTypes.func.isRequired,
            selectInitialChannel: PropTypes.func.isRequired,
            initWebSocket: PropTypes.func.isRequired,
            closeWebSocket: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
            startPeriodicStatusUpdates: PropTypes.func.isRequired,
            stopPeriodicStatusUpdates: PropTypes.func.isRequired,
        }).isRequired,
        currentChannelId: PropTypes.string,
        channelsRequestFailed: PropTypes.bool,
        currentTeamId: PropTypes.string,
        isLandscape: PropTypes.bool,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.isX = DeviceInfo.getModel().includes('iPhone X');

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentWillMount() {
        EventEmitter.on('leave_team', this.handleLeaveTeam);

        this.networkListener = networkConnectionListener(this.handleConnectionChange);

        if (this.props.currentTeamId) {
            this.loadChannels(this.props.currentTeamId);
        } else {
            this.props.actions.selectDefaultTeam();
        }
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);

        if (tracker.initialLoad) {
            this.props.actions.recordLoadTime('Start time', 'initialLoad');
        }

        EventEmitter.emit('renderDrawer');
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            this.props.navigator.setStyle({
                screenBackgroundColor: nextProps.theme.centerChannelBg,
            });
        }

        if (nextProps.currentTeamId && this.props.currentTeamId !== nextProps.currentTeamId) {
            this.loadChannels(nextProps.currentTeamId);
        }

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentDidUpdate(prevProps) {
        if (tracker.teamSwitch) {
            this.props.actions.recordLoadTime('Switch Team', 'teamSwitch');
        }

        // When the team changes emit the event to render the drawer content
        if (this.props.currentChannelId && !prevProps.currentChannelId) {
            EventEmitter.emit('renderDrawer');
        }
    }

    componentWillUnmount() {
        const {closeWebSocket, stopPeriodicStatusUpdates} = this.props.actions;

        EventEmitter.off('leave_team', this.handleLeaveTeam);
        this.networkListener.removeEventListener();

        AppState.removeEventListener('change', this.handleAppStateChange);

        closeWebSocket();
        stopPeriodicStatusUpdates();
    }

    attachPostTextBox = (ref) => {
        this.postTextbox = ref;
    };

    blurPostTextBox = () => {
        if (this.postTextbox && this.postTextbox.getWrappedInstance()) {
            this.postTextbox.getWrappedInstance().blur();
        }
    };

    channelLoaderDimensions = () => {
        const {isLandscape} = this.props;
        let top = 0;
        let {height} = Dimensions.get('window');
        switch (Platform.OS) {
        case 'android':
            if (isLandscape) {
                top = ANDROID_TOP_LANDSCAPE;
            } else {
                top = ANDROID_TOP_PORTRAIT;
                height = (height - 84);
            }
            break;
        case 'ios':
            if (isLandscape) {
                top = IOS_TOP_LANDSCAPE;
            } else {
                height = this.isX ? (height - IOSX_TOP_PORTRAIT) : (height - IOS_TOP_PORTRAIT);
                top = this.isX ? IOSX_TOP_PORTRAIT : IOS_TOP_PORTRAIT;
            }
            break;
        }

        return {height, top};
    };

    channelSidebarRef = (ref) => {
        if (ref) {
            this.channelSidebar = ref.getWrappedInstance();
        }
    };

    settingsSidebarRef = (ref) => {
        if (ref) {
            this.settingsSidebar = ref.getWrappedInstance();
        }
    };

    goToChannelInfo = preventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, theme} = this.props;
        const options = {
            screen: 'ChannelInfo',
            title: intl.formatMessage({id: 'mobile.routes.channelInfo', defaultMessage: 'Info'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        if (Platform.OS === 'android') {
            navigator.showModal(options);
        } else {
            navigator.push(options);
        }
    });

    handleWebSocket = (open) => {
        const {actions} = this.props;
        const {
            closeWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        } = actions;

        if (open) {
            this.initializeWebSocket();
            startPeriodicStatusUpdates();
        } else {
            closeWebSocket(true);
            stopPeriodicStatusUpdates();
        }
    };

    handleAppStateChange = async (appState) => {
        this.handleWebSocket(appState === 'active');
    };

    handleConnectionChange = (isConnected) => {
        const {connection} = this.props.actions;

        // Prevent for being called more than once.
        if (this.isConnected !== isConnected) {
            this.isConnected = isConnected;
            this.handleWebSocket(isConnected);
            connection(isConnected);
        }
    };

    handleLeaveTeam = () => {
        this.props.actions.selectDefaultTeam();
    };

    initializeWebSocket = async () => {
        const {formatMessage} = this.context.intl;
        const {actions} = this.props;
        const {initWebSocket} = actions;
        const platform = Platform.OS;
        let certificate = null;
        if (platform === 'ios') {
            certificate = await mattermostBucket.getPreference('cert', LocalConfig.AppGroupId);
        }

        initWebSocket(platform, null, null, null, {certificate}).catch(() => {
            // we should dispatch a failure and show the app as disconnected
            Alert.alert(
                formatMessage({id: 'mobile.authentication_error.title', defaultMessage: 'Authentication Error'}),
                formatMessage({
                    id: 'mobile.authentication_error.message',
                    defaultMessage: 'Mattermost has encountered an error. Please re-authenticate to start a new session.',
                }),
                [{
                    text: formatMessage({
                        id: 'navbar_dropdown.logout',
                        defaultMessage: 'Logout',
                    }),
                    onPress: actions.logout,
                }],
                {cancelable: false}
            );
            this.props.actions.closeWebSocket(true);
        });
    };

    loadChannels = (teamId) => {
        const {
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel,
        } = this.props.actions;

        loadChannelsIfNecessary(teamId).then(() => {
            loadProfilesAndTeamMembersForDMSidebar(teamId);
            selectInitialChannel(teamId);
        }).catch(() => {
            selectInitialChannel(teamId);
        });
    };

    openChannelSidebar = () => {
        if (this.channelSidebar) {
            this.channelSidebar.openChannelSidebar();
        }
    };

    openSettingsSidebar = () => {
        if (this.settingsSidebar) {
            this.settingsSidebar.openSettingsSidebar();
        }
    };

    retryLoadChannels = () => {
        this.loadChannels(this.props.currentTeamId);
    };

    render() {
        const {
            channelsRequestFailed,
            currentChannelId,
            isLandscape,
            navigator,
            theme,
        } = this.props;

        const style = getStyleFromTheme(theme);

        if (!currentChannelId) {
            if (channelsRequestFailed) {
                const PostListRetry = require('app/components/post_list_retry').default;
                return (
                    <PostListRetry
                        retry={this.retryLoadChannels}
                        theme={theme}
                    />
                );
            }

            const Loading = require('app/components/channel_loader').default;
            return (
                <SafeAreaView navigator={navigator}>
                    <View style={style.loading}>
                        <EmptyToolbar
                            theme={theme}
                            isLandscape={this.props.isLandscape}
                        />
                        <Loading channelIsLoading={true}/>
                    </View>
                </SafeAreaView>
            );
        }

        const loaderDimensions = this.channelLoaderDimensions();

        // console.warn('height', height, Date.now())
        return (
            <MainSidebar
                ref={this.channelSidebarRef}
                blurPostTextBox={this.blurPostTextBox}
                navigator={navigator}
            >
                <SettingsSidebar
                    ref={this.settingsSidebarRef}
                    blurPostTextBox={this.blurPostTextBox}
                    navigator={navigator}
                >
                    <SafeAreaView navigator={navigator}>
                        <StatusBar/>
                        <OfflineIndicator/>
                        <ChannelNavBar
                            navigator={navigator}
                            openChannelDrawer={this.openChannelSidebar}
                            openSettingsDrawer={this.openSettingsSidebar}
                            onPress={this.goToChannelInfo}
                        />
                        <KeyboardLayout>
                            <View style={style.postList}>
                                <ChannelPostList navigator={navigator}/>
                            </View>
                            <PostTextbox
                                ref={this.attachPostTextBox}
                                navigator={navigator}
                            />
                        </KeyboardLayout>
                        <ChannelLoader
                            style={[style.channelLoader, loaderDimensions]}
                            maxRows={isLandscape ? 4 : 6}
                        />
                        {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener navigator={navigator}/>}
                    </SafeAreaView>
                </SettingsSidebar>
            </MainSidebar>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        postList: {
            flex: 1,
        },
        loading: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        channelLoader: {
            position: 'absolute',
            width: '100%',
            flex: 1,
        },
    };
});
