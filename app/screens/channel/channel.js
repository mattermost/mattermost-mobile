// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    NetInfo,
    Platform,
    StatusBar,
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
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelTitle from './channel_title';
import ChannelPostList from './channel_post_list/index';

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
        webSocketRequest: PropTypes.object
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
        if (this.props.currentTeam && nextProps.currentTeam && this.props.currentTeam.id !== nextProps.currentTeam.id) {
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

        navigator.push({
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
        });
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

    render() {
        const {
            currentTeam,
            currentChannel,
            navigator,
            theme
        } = this.props;

        if (!currentTeam || !currentChannel) {
            return (
                <View style={{flex: 1, backgroundColor: theme.centerChannelBg}}>
                    <Loading/>
                </View>
            );
        }

        const channelDraft = this.props.drafts[currentChannel.id];
        const style = getStyleFromTheme(theme);

        return (
            <ChannelDrawer
                blurPostTextBox={this.blurPostTextBox}
                navigator={navigator}
            >
                <StatusBar barStyle='light-content'/>
                <KeyboardLayout
                    behavior='padding'
                    style={{flex: 1, backgroundColor: theme.centerChannelBg}}
                    keyboardVerticalOffset={0}
                >
                    <ChannelPostList
                        channel={currentChannel}
                        navigator={navigator}
                    />
                    <PostTextbox
                        ref={this.attachPostTextbox}
                        files={channelDraft.files}
                        value={channelDraft.draft}
                        channelId={currentChannel.id}
                        onChangeText={this.handleDraftChanged}
                        navigator={navigator}
                    />
                </KeyboardLayout>
                <View style={{flex: 1, position: 'absolute'}}>
                    <View style={style.header}>
                        <ChannelDrawerButton/>
                        <ChannelTitle
                            onPress={() => preventDoubleTap(this.goToChannelInfo, this)}
                        />
                    </View>
                    <OfflineIndicator/>
                </View>
            </ChannelDrawer>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
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
        }
    });
});

export default injectIntl(Channel);
