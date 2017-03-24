// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
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
            currentChannel,
            currentTeam
        } = this.props;

        this.props.actions.markChannelAsRead(currentChannel.id);
        this.props.actions.setChannelLoading();
        this.props.actions.viewChannel(currentTeam.id, id);
        this.props.actions.closeDrawers();
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.handleSelectChannel(id);
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
