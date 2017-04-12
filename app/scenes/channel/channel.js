// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    NetInfo,
    Platform,
    StatusBar,
    View
} from 'react-native';

import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import OfflineIndicator from 'app/components/offline_indicator';
import PostTextbox from 'app/components/post_textbox';
import {preventDoubleTap} from 'app/utils/tap';

import {Constants, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelTitle from './channel_title';
import ChannelPostList from './channel_post_list';

export default class Channel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            connection: PropTypes.func.isRequired,
            loadChannelsIfNecessary: PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: PropTypes.func.isRequired,
            selectFirstAvailableTeam: PropTypes.func.isRequired,
            selectInitialChannel: PropTypes.func.isRequired,
            openChannelDrawer: PropTypes.func.isRequired,
            handlePostDraftChanged: PropTypes.func.isRequired,
            goToChannelInfo: PropTypes.func.isRequired,
            initWebSocket: PropTypes.func.isRequired,
            closeWebSocket: PropTypes.func.isRequired,
            startPeriodicStatusUpdates: PropTypes.func.isRequired,
            stopPeriodicStatusUpdates: PropTypes.func.isRequired,
            renderDrawer: PropTypes.func.isRequired
        }).isRequired,
        appState: PropTypes.bool,
        currentTeam: PropTypes.object,
        currentChannel: PropTypes.object,
        drafts: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        subscribeToHeaderEvent: PropTypes.func,
        unsubscribeFromHeaderEvent: PropTypes.func,
        webSocketRequest: PropTypes.object
    };

    static navigationProps = {
        allowMenuSwipe: true,
        renderLeftComponent: (props, emitter) => {
            return <ChannelDrawerButton emitter={emitter}/>;
        },
        renderTitleComponent: (props, emitter) => {
            return <ChannelTitle emitter={emitter}/>;
        }
    };

    componentWillMount() {
        this.props.subscribeToHeaderEvent('open_channel_drawer', () => preventDoubleTap(this.openChannelDrawer, this));
        this.props.subscribeToHeaderEvent('show_channel_info', () => preventDoubleTap(this.props.actions.goToChannelInfo));
        NetInfo.isConnected.addEventListener('change', this.handleConnectionChange);
        EventEmitter.on('leave_team', this.handleLeaveTeam);
        NetInfo.isConnected.fetch().then(this.handleConnectionChange);

        if (this.props.currentTeam) {
            const teamId = this.props.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    componentDidMount() {
        const {renderDrawer, startPeriodicStatusUpdates} = this.props.actions;
        try {
            startPeriodicStatusUpdates();
        } catch (error) {
            // We don't care about the error
        }
        renderDrawer();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.currentTeam && nextProps.currentTeam && this.props.currentTeam.id !== nextProps.currentTeam.id) {
            const teamId = nextProps.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    componentWillUnmount() {
        this.props.actions.closeWebSocket();
        this.props.actions.stopPeriodicStatusUpdates();
        this.props.unsubscribeFromHeaderEvent('open_channel_drawer');
        NetInfo.isConnected.removeEventListener('change', this.handleConnectionChange);
        EventEmitter.off('leave_team', this.handleLeaveTeam);
    }

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

    loadChannels = (teamId) => {
        const {
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel
        } = this.props.actions;
        loadChannelsIfNecessary(teamId).then(() => {
            loadProfilesAndTeamMembersForDMSidebar(teamId);
            return selectInitialChannel(teamId);
        });
    };

    openChannelDrawer = () => {
        this.postTextbox.getWrappedInstance().getWrappedInstance().blur();
        this.props.actions.openChannelDrawer();
    };

    attachPostTextbox = (ref) => {
        this.postTextbox = ref;
    };

    handleDraftChanged = (value) => {
        this.props.actions.handlePostDraftChanged(this.props.currentChannel.id, value);
    };

    handleLeaveTeam = () => {
        this.props.actions.selectFirstAvailableTeam();
    };

    render() {
        const {
            currentTeam,
            currentChannel,
            theme
        } = this.props;

        if (!currentTeam || !currentChannel) {
            return (
                <View style={{flex: 1, backgroundColor: theme.centerChannelBg}}>
                    <Loading/>
                </View>
            );
        }

        let teamId = currentChannel.team_id;
        if (currentChannel.type === Constants.DM_CHANNEL || currentChannel.type === Constants.GM_CHANNEL) {
            teamId = currentTeam.id;
        }

        const channelDraft = this.props.drafts[this.props.currentChannel.id];

        return (
            <KeyboardLayout
                behavior='padding'
                style={{flex: 1, backgroundColor: theme.centerChannelBg}}
                keyboardVerticalOffset={65}
            >
                <StatusBar barStyle='light-content'/>
                <OfflineIndicator/>
                <ChannelPostList channel={currentChannel}/>
                <PostTextbox
                    ref={this.attachPostTextbox}
                    files={channelDraft.files}
                    value={channelDraft.draft}
                    teamId={teamId}
                    channelId={currentChannel.id}
                    onChangeText={this.handleDraftChanged}
                />
            </KeyboardLayout>
        );
    }
}
