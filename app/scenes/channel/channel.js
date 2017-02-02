// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    KeyboardAvoidingView,
    StatusBar,
    Text
} from 'react-native';

import PostTextbox from 'app/components/post_textbox';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelMenuButton from './channel_menu_button';
import ChannelTitle from './channel_title';
import ChannelPostList from './channel_post_list';

export default class Channel extends React.PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            loadChannelsIfNecessary: React.PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: React.PropTypes.func.isRequired,
            selectInitialChannel: React.PropTypes.func.isRequired,
            openChannelDrawer: React.PropTypes.func.isRequired,
            openRightMenuDrawer: React.PropTypes.func.isRequired,
            handlePostDraftChanged: React.PropTypes.func.isRequired,
            goToChannelInfo: React.PropTypes.func.isRequired,
            initWebSocket: React.PropTypes.func.isRequired,
            closeWebSocket: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        postDraft: React.PropTypes.string.isRequired,
        theme: React.PropTypes.object.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func
    };

    static navigationProps = {
        allowSwipe: true,
        renderLeftComponent: (props, emitter) => {
            return <ChannelDrawerButton emitter={emitter}/>;
        },
        renderTitleComponent: (props, emitter) => {
            return <ChannelTitle emitter={emitter}/>;
        },
        renderRightComponent: (props, emitter) => {
            return <ChannelMenuButton emitter={emitter}/>;
        }
    }

    constructor(props) {
        super(props);

        this.state = {
            leftSidebarOpen: false,
            rightSidebarOpen: false
        };
    }

    componentWillMount() {
        this.props.subscribeToHeaderEvent('open_channel_drawer', this.openChannelDrawer);
        this.props.subscribeToHeaderEvent('open_right_menu', this.openRightMenuDrawer);
        this.props.subscribeToHeaderEvent('show_channel_info', this.props.actions.goToChannelInfo);
        const teamId = this.props.currentTeam.id;
        this.props.actions.initWebSocket();
        this.loadChannels(teamId);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.currentTeam && this.props.currentTeam.id !== nextProps.currentTeam.id) {
            const teamId = nextProps.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    componentWillUnmount() {
        this.props.actions.closeWebSocket();
        this.props.unsubscribeFromHeaderEvent('open_channel_drawer');
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

    openRightMenuDrawer = () => {
        this.postTextbox.getWrappedInstance().blur();
        this.props.actions.openRightMenuDrawer();
    };

    attachPostTextbox = (c) => {
        this.postTextbox = c;
    }

    render() {
        const {
            currentTeam,
            currentChannel,
            theme
        } = this.props;

        if (!currentTeam) {
            return <Text>{'Waiting on team'}</Text>;
        } else if (!currentChannel) {
            return <Text>{'Waiting on channel'}</Text>;
        }

        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={{flex: 1, backgroundColor: theme.centerChannelBg}}
            >
                <StatusBar barStyle='light-content'/>
                <ChannelPostList channel={currentChannel}/>
                <PostTextbox
                    ref={this.attachPostTextbox}
                    value={this.props.postDraft}
                    teamId={currentChannel.team_id}
                    channelId={currentChannel.id}
                    onChangeText={this.props.actions.handlePostDraftChanged}
                />
            </KeyboardAvoidingView>
        );
    }
}
