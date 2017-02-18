// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import ChannelDrawerList from 'app/components/channel_drawer_list';

export default class ChannelDrawer extends React.PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            closeDrawers: React.PropTypes.func.isRequired,
            handleSelectChannel: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.object,
        channelMembers: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    }

    selectChannel = (id) => {
        this.props.actions.handleSelectChannel(id);
    };

    render() {
        const {
            currentChannel,
            currentTeam,
            channels,
            channelMembers,
            theme
        } = this.props;

        return (
            <ChannelDrawerList
                currentTeam={currentTeam}
                currentChannel={currentChannel}
                channels={channels}
                channelMembers={channelMembers}
                theme={theme}
                onSelectChannel={this.selectChannel}
            />
        );
    }
}
