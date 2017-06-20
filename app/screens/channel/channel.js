// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    NetInfo,
    Platform,
    StyleSheet,
    View
} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelDrawer from 'app/components/channel_drawer';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import OfflineIndicator from 'app/components/offline_indicator';
import PostTextbox from 'app/components/post_textbox';
import PostListRetry from 'app/components/post_list_retry';
import StatusBar from 'app/components/status_bar';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelTitle from './channel_title';
import ChannelPostList from './channel_post_list';
import ChannelSearchButton from './channel_search_button';

class Channel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            connection: PropTypes.func.isRequired,
            loadChannelsIfNecessary: PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: PropTypes.func.isRequired,
            selectFirstAvailableTeam: PropTypes.func.isRequired,
            selectInitialChannel: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired,
            initWebSocket: PropTypes.func.isRequired,
            closeWebSocket: PropTypes.func.isRequired,
            startPeriodicStatusUpdates: PropTypes.func.isRequired,
            stopPeriodicStatusUpdates: PropTypes.func.isRequired
        }).isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        appState: PropTypes.bool,
        currentTeam: PropTypes.object,
        currentChannel: PropTypes.object,
        drafts: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        subscribeToHeaderEvent: PropTypes.func,
        unsubscribeFromHeaderEvent: PropTypes.func,
        webSocketRequest: PropTypes.object,
        statusBarHeight: PropTypes.number,
        channelsRequestStatus: PropTypes.string
    };

    componentWillMount() {
        EventEmitter.on('leave_team', this.handleLeaveTeam);
        NetInfo.isConnected.addEventListener('change', this.handleConnectionChange);
        NetInfo.isConnected.fetch().then(this.handleConnectionChange);

        if (this.props.currentTeam) {
            const teamId = this.props.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    componentDidMount() {
        const {startPeriodicStatusUpdates} = this.props.actions;

        try {
            startPeriodicStatusUpdates();
        } catch (error) {
            // We don't care about the error
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.currentTeam.id && this.props.currentTeam.id !== nextProps.currentTeam.id) {
            const teamId = nextProps.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    componentWillUnmount() {
        const {closeWebSocket, stopPeriodicStatusUpdates} = this.props.actions;

        EventEmitter.off('leave_team', this.handleLeaveTeam);
        NetInfo.isConnected.removeEventListener('change', this.handleConnectionChange);

        closeWebSocket();
        stopPeriodicStatusUpdates();
    }

    attachPostTextbox = (ref) => {
        this.postTextbox = ref;
    };

    blurPostTextBox = () => {
        this.postTextbox.getWrappedInstance().getWrappedInstance().blur();
    };

    goToChannelInfo = () => {
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
                screenBackgroundColor: theme.centerChannelBg
            }
        };

        if (Platform.OS === 'android') {
            navigator.showModal(options);
        } else {
            navigator.push(options);
        }
    };

    handleConnectionChange = (isConnected) => {
        const {actions, webSocketRequest} = this.props;
        const {closeWebSocket, connection, initWebSocket} = actions;

        if (isConnected) {
            if (!webSocketRequest || webSocketRequest.status === RequestStatus.NOT_STARTED) {
                try {
                    initWebSocket(Platform.OS);
                } catch (error) {
                    // We don't care if it fails
                }
            }
        } else {
            closeWebSocket(true);
        }
        connection(isConnected);
    };

    handleDraftChanged = (value) => {
        this.props.actions.handlePostDraftChanged(this.props.currentChannel.id, value);
    };

    handleLeaveTeam = () => {
        this.props.actions.selectFirstAvailableTeam();
    };

    loadChannels = (teamId) => {
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

    retryLoadChannels = () => {
        this.loadChannels(this.props.currentTeam.id);
    };

    render() {
        const {
            channelsRequestStatus,
            currentChannel,
            drafts,
            intl,
            navigator,
            statusBarHeight,
            theme
        } = this.props;

        const style = getStyleFromTheme(theme);

        if (!currentChannel.hasOwnProperty('id')) {
            if (channelsRequestStatus === RequestStatus.FAILURE) {
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

        const channelDraft = drafts[currentChannel.id] || {};

        let height = 0;
        if (statusBarHeight > 20) {
            height = statusBarHeight - 20;
        }

        return (
            <ChannelDrawer
                blurPostTextBox={this.blurPostTextBox}
                intl={intl}
                navigator={navigator}
            >
                <StatusBar/>
                <KeyboardLayout
                    behavior='padding'
                    style={style.keyboardLayout}
                    keyboardVerticalOffset={height}
                >
                    <View style={style.postList}>
                        <ChannelPostList
                            channel={currentChannel}
                            navigator={navigator}
                        />
                    </View>
                    <PostTextbox
                        ref={this.attachPostTextbox}
                        files={channelDraft.files}
                        value={channelDraft.draft}
                        channelId={currentChannel.id}
                        onChangeText={this.handleDraftChanged}
                        navigator={navigator}
                    />
                </KeyboardLayout>
                <View style={style.headerContainer}>
                    <View style={style.header}>
                        <ChannelDrawerButton/>
                        <ChannelTitle
                            onPress={() => preventDoubleTap(this.goToChannelInfo, this)}
                        />
                        <ChannelSearchButton navigator={navigator}/>
                    </View>
                    <OfflineIndicator/>
                </View>
            </ChannelDrawer>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        headerContainer: {
            flex: 1,
            position: 'absolute'
        },
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: Dimensions.get('window').width,
            zIndex: 10,
            elevation: 2,
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 64,
                    paddingTop: 20
                }
            })
        },
        postList: {
            flex: 1,
            ...Platform.select({
                android: {
                    marginTop: 46
                },
                ios: {
                    marginTop: 64
                }
            })
        },
        loading: {
            backgroundColor: theme.centerChannelBg,
            flex: 1
        },
        keyboardLayout: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            paddingBottom: 0
        }
    });
});

export default injectIntl(Channel);
