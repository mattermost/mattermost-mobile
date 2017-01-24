// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import ChannelList from 'app/components/channel_drawer/channel_list';

export default class ChannelDrawer extends React.PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            selectChannel: React.PropTypes.func.isRequired,
            viewChannel: React.PropTypes.func.isRequired,
            closeDMChannel: React.PropTypes.func.isRequired,
            closeDrawers: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.object,
        channelMembers: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired
    };

    selectChannel = (id) => {
        this.props.actions.selectChannel(id);
        this.props.actions.closeDrawers();
    }

    render() {
        const {
            currentChannel,
            currentTeam,
            channels,
            channelMembers,
            theme
        } = this.props;

        return (
            <ChannelList
                currentTeam={currentTeam}
                currentChannel={currentChannel}
                channels={channels}
                channelMembers={channelMembers}
                theme={theme}
                onSelectChannel={this.selectChannel}
                onViewChannel={this.props.actions.viewChannel}
                handleCloseDM={this.props.actions.closeDMChannel}
            />
        );
    }
}
