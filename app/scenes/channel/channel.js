// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    KeyboardAvoidingView,
    StatusBar,
    Text
} from 'react-native';
import Drawer from 'react-native-drawer';

import ChannelDrawer from 'app/components/channel_drawer';
import PostTextbox from 'app/components/post_textbox';
import RightSidebarMenu from 'app/components/right_sidebar_menu';

import ChannelHeader from './channel_header';
import ChannelPostList from './channel_post_list';

export default class Channel extends React.PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            loadChannelsIfNecessary: React.PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: React.PropTypes.func.isRequired,
            selectInitialChannel: React.PropTypes.func.isRequired,
            openChannelDrawer: React.PropTypes.func.isRequired,
            handlePostDraftChanged: React.PropTypes.func.isRequired,
            goToChannelInfo: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        postDraft: React.PropTypes.string.isRequired,
        theme: React.PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            leftSidebarOpen: false,
            rightSidebarOpen: false
        };
    }

    componentWillMount() {
        const teamId = this.props.currentTeam.id;
        this.loadChannels(teamId);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.currentTeam && this.props.currentTeam.id !== nextProps.currentTeam.id) {
            const teamId = nextProps.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    loadChannels = (teamId) => {
        this.props.actions.loadChannelsIfNecessary(teamId).then(() => {
            this.props.actions.loadProfilesAndTeamMembersForDMSidebar(teamId);
            return this.props.actions.selectInitialChannel(teamId);
        });
    };

    openRightSidebar = () => {
        this.refs.postTextbox.getWrappedInstance().blur();
        this.setState({rightSidebarOpen: true});
    };

    closeRightSidebar = () => {
        this.setState({rightSidebarOpen: false});
    };

    openChannelDrawer = () => {
        this.refs.postTextbox.getWrappedInstance().blur();
        this.props.actions.openChannelDrawer();
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
                <StatusBar barStyle='default'/>
                <ChannelDrawer
                    currentTeam={currentTeam}
                    currentChannel={currentChannel}
                    theme={theme}
                >
                    <Drawer
                        open={this.state.rightSidebarOpen}
                        type='displace'
                        content={<RightSidebarMenu onClose={this.closeRightSidebar}/>}
                        side='right'
                        tapToClose={true}
                        onCloseStart={this.closeRightSidebar}
                        openDrawerOffset={0.2}
                    >
                        <ChannelHeader
                            currentChannel={currentChannel}
                            openLeftDrawer={this.openChannelDrawer}
                            openRightDrawer={this.openRightSidebar}
                            goToChannelInfo={this.props.actions.goToChannelInfo}
                        />
                        <ChannelPostList channel={currentChannel}/>
                        <PostTextbox
                            ref='postTextbox'
                            value={this.props.postDraft}
                            teamId={currentChannel.team_id}
                            channelId={currentChannel.id}
                            onChangeText={this.props.actions.handlePostDraftChanged}
                        />
                    </Drawer>
                </ChannelDrawer>
            </KeyboardAvoidingView>
        );
    }
}
