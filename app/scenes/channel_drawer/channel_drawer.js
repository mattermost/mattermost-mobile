// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {InteractionManager} from 'react-native';

import ChannelDrawerList from 'app/components/channel_drawer_list';

export default class ChannelDrawer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            closeDrawers: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            viewChannel: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired
        }).isRequired,
        currentTeam: PropTypes.object,
        currentChannel: PropTypes.object,
        channels: PropTypes.object,
        channelMembers: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    };

    selectChannel = (id) => {
        const {
            actions,
            currentChannel,
            currentTeam
        } = this.props;

        const {
            closeDrawers,
            handleSelectChannel,
            markChannelAsRead,
            setChannelLoading,
            viewChannel
        } = actions;

        markChannelAsRead(currentChannel.id);
        setChannelLoading();
        viewChannel(currentTeam.id, id);
        closeDrawers();
        InteractionManager.runAfterInteractions(() => {
            handleSelectChannel(id);
        });
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
