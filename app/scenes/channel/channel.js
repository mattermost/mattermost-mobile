// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Platform,
    StatusBar,
    View
} from 'react-native';

import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import PostTextbox from 'app/components/post_textbox';

import {Constants} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelTitle from './channel_title';
import ChannelPostList from './channel_post_list';

export default class Channel extends React.PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            loadChannelsIfNecessary: React.PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: React.PropTypes.func.isRequired,
            selectFirstAvailableTeam: React.PropTypes.func.isRequired,
            selectInitialChannel: React.PropTypes.func.isRequired,
            openChannelDrawer: React.PropTypes.func.isRequired,
            handlePostDraftChanged: React.PropTypes.func.isRequired,
            goToChannelInfo: React.PropTypes.func.isRequired,
            initWebSocket: React.PropTypes.func.isRequired,
            closeWebSocket: React.PropTypes.func.isRequired,
            startPeriodicStatusUpdates: React.PropTypes.func.isRequired,
            stopPeriodicStatusUpdates: React.PropTypes.func.isRequired,
            renderDrawer: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        drafts: React.PropTypes.object.isRequired,
        theme: React.PropTypes.object.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func
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
        this.props.subscribeToHeaderEvent('open_channel_drawer', this.openChannelDrawer);
        this.props.subscribeToHeaderEvent('show_channel_info', this.props.actions.goToChannelInfo);
        EventEmitter.on('leave_team', this.handleLeaveTeam);
        this.props.actions.initWebSocket(Platform.OS);
        if (this.props.currentTeam) {
            const teamId = this.props.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    componentDidMount() {
        this.props.actions.startPeriodicStatusUpdates();
        this.props.actions.renderDrawer();
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
        EventEmitter.off('leave_team', this.handleLeaveTeam);
    }

    loadChannels = (teamId) => {
        this.props.actions.loadChannelsIfNecessary(teamId).then(() => {
            this.props.actions.loadProfilesAndTeamMembersForDMSidebar(teamId);
            return this.props.actions.selectInitialChannel(teamId);
        });
    };

    openChannelDrawer = () => {
        this.postTextbox.getWrappedInstance().blur();
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
        if (currentChannel.type === Constants.DM_CHANNEL) {
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
