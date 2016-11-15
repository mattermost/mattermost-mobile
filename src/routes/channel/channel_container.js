// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {fetchMyChannelsAndMembers} from 'actions/channels.js';
import Channel from './channel.js';

function mapStateToProps(state, ownProps) {
    let currentChannel;
    if (ownProps.currentChannelId) {
        currentChannel = state.entities.channel.channels[ownProps.currentChannelId];
    } else {
        // TODO figure out the town square id before this
        const channelIds = state.entities.channel.channelIdsByTeamId[ownProps.currentTeamId] || {};

        for (const channelId of Object.keys(channelIds)) {
            const channel = state.entities.channel.channels[channelId];

            if (channel.name === 'town-square') {
                currentChannel = channel;
                break;
            }
        }
    }

    return {
        ...ownProps,
        currentTeam: state.entities.teams.data[ownProps.currentTeamId] || {},
        currentChannel
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
