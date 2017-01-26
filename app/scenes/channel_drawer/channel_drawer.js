// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import ChannelList from 'app/components/channel_drawer/channel_list';

export default class ChannelDrawer extends React.PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            closeDrawers: React.PropTypes.func.isRequired,
            shouldDisableChannelDrawer: React.PropTypes.func.isRequired,
            selectChannel: React.PropTypes.func.isRequired,
            viewChannel: React.PropTypes.func.isRequired,
            closeDMChannel: React.PropTypes.func.isRequired,
            leaveChannel: React.PropTypes.func.isRequired,
            markFavorite: React.PropTypes.func.isRequired,
            unmarkFavorite: React.PropTypes.func.isRequired
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
    };

    render() {
        const {
            currentChannel,
            currentTeam,
            channels,
            channelMembers,
            theme
        } = this.props;

        const {
            viewChannel,
            closeDMChannel,
            leaveChannel,
            markFavorite,
            unmarkFavorite,
            shouldDisableChannelDrawer
        } = this.props.actions;

        return (
            <ChannelList
                currentTeam={currentTeam}
                currentChannel={currentChannel}
                channels={channels}
                channelMembers={channelMembers}
                theme={theme}
                onSelectChannel={this.selectChannel}
                onViewChannel={viewChannel}
                handleCloseDM={closeDMChannel}
                handleLeaveChannel={leaveChannel}
                handleDisableDrawer={shouldDisableChannelDrawer}
                markFavorite={markFavorite}
                unmarkFavorite={unmarkFavorite}
            />
        );
    }
}
