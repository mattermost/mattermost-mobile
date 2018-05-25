// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    AppState,
    Platform,
    View,
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelDrawer from 'app/components/channel_drawer';
import EmptyToolbar from 'app/components/start/empty_toolbar';
import SettingsDrawer from 'app/components/settings_drawer';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import OfflineIndicator from 'app/components/offline_indicator';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import PostTextbox from 'app/components/post_textbox';
import networkConnectionListener from 'app/utils/network';
import tracker from 'app/utils/time_tracker';
import LocalConfig from 'assets/config';

import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

let ClientUpgradeListener;

export default class Channel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            connection: PropTypes.func.isRequired,
            loadChannelsIfNecessary: PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: PropTypes.func.isRequired,
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
            initWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        } = actions;

        if (open) {
            initWebSocket(Platform.OS);
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

        this.handleWebSocket(isConnected);
        connection(isConnected);
    };

    handleLeaveTeam = () => {
        this.props.actions.selectDefaultTeam();
    };

    loadChannels = (teamId) => {
        const {
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel,
        } = this.props.actions;

        loadChannelsIfNecessary(teamId).then(() => {
            loadProfilesAndTeamMembersForDMSidebar(teamId);
            return selectInitialChannel(teamId);
        }).catch(() => {
            return selectInitialChannel(teamId);
        });
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

    retryLoadChannels = () => {
        this.loadChannels(this.props.currentTeamId);
    };

    render() {
        const {intl} = this.context;
        const {
            channelsRequestFailed,
            currentChannelId,
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
                                ref={this.attachPostTextBox}
                                navigator={navigator}
                            />
                        </KeyboardLayout>
                        {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener navigator={navigator}/>}
                    </SafeAreaView>
                </SettingsDrawer>
            </ChannelDrawer>
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
    };
});
