// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    AppState,
    Platform,
    View,
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ClientUpgradeListener from 'app/components/client_upgrade_listener';
import ChannelDrawer from 'app/components/channel_drawer';
import SettingsDrawer from 'app/components/settings_drawer';
import ChannelLoader from 'app/components/channel_loader';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import OfflineIndicator from 'app/components/offline_indicator';
import PostListRetry from 'app/components/post_list_retry';
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

class Channel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            connection: PropTypes.func.isRequired,
            loadChannelsIfNecessary: PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: PropTypes.func.isRequired,
            selectFirstAvailableTeam: PropTypes.func.isRequired,
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
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    componentWillMount() {
        EventEmitter.on('leave_team', this.handleLeaveTeam);

        this.networkListener = networkConnectionListener(this.handleConnectionChange);

        if (this.props.currentTeamId) {
            this.loadChannels(this.props.currentTeamId);
        } else {
            this.props.actions.selectFirstAvailableTeam();
        }
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            AppState.addEventListener('change', this.handleAppStateChange);
        }

        if (tracker.initialLoad) {
            this.props.actions.recordLoadTime('Start time', 'initialLoad');
        }
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
    }

    componentDidUpdate() {
        if (tracker.teamSwitch) {
            this.props.actions.recordLoadTime('Switch Team', 'teamSwitch');
        }
    }

    componentWillUnmount() {
        const {closeWebSocket, stopPeriodicStatusUpdates} = this.props.actions;

        EventEmitter.off('leave_team', this.handleLeaveTeam);
        this.networkListener.removeEventListener();

        if (Platform.OS === 'android') {
            AppState.removeEventListener('change', this.handleAppStateChange);
        }

        closeWebSocket();
        stopPeriodicStatusUpdates();
    }

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

    goToChannelInfo = preventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;
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

    handleAppStateChange = async (appState) => {
        const {actions} = this.props;
        const {
            closeWebSocket,
            initWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        } = actions;
        const isActive = appState === 'active';

        if (isActive) {
            initWebSocket(Platform.OS);
            startPeriodicStatusUpdates();
        } else {
            closeWebSocket(true);
            stopPeriodicStatusUpdates();
        }
    };

    handleConnectionChange = (isConnected) => {
        const {actions} = this.props;
        const {
            closeWebSocket,
            connection,
            initWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        } = actions;

        if (isConnected) {
            initWebSocket(Platform.OS);
            startPeriodicStatusUpdates();
        } else {
            closeWebSocket(true);
            stopPeriodicStatusUpdates();
        }
        connection(isConnected);
    };

    handleLeaveTeam = () => {
        this.props.actions.selectFirstAvailableTeam();
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
        const {
            channelsRequestFailed,
            currentChannelId,
            intl,
            navigator,
            theme,
        } = this.props;

        const style = getStyleFromTheme(theme);

        if (!currentChannelId) {
            if (channelsRequestFailed) {
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

export default injectIntl(Channel);
