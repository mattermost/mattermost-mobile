// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {fetchMyChannelsAndMembers} from 'service/actions/channels';
import {getTheme} from 'service/selectors/entities/preferences';

import Channel from './channel.js';

function mapStateToProps(state, ownProps) {
    const currentTeamId = state.entities.teams.currentId;
    const currentTeam = state.entities.teams.teams[currentTeamId];
    let channels = state.entities.channels.channels;

    let currentChannel;
    if (ownProps.currentChannelId) {
        currentChannel = state.entities.channels.channels[ownProps.currentChannelId];
    } else {
        // TODO figure out the town square id before this
        for (const channelId of Object.keys(channels)) {
            const channel = channels[channelId];

            if (channel.name === 'town-square') {
                currentChannel = channel;
                break;
            }
        }
    }

    channels = Object.keys(channels).map((channelId) => channels[channelId]);

    return {
        ...ownProps,
        currentTeam,
        currentChannel,
        channels,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            fetchMyChannelsAndMembers
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
