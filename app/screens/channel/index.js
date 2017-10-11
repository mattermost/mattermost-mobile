// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {viewChannel, markChannelAsRead} from 'mattermost-redux/actions/channels';
import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates} from 'mattermost-redux/actions/users';
import {init as initWebSocket, close as closeWebSocket} from 'mattermost-redux/actions/websocket';
import {RequestStatus} from 'mattermost-redux/constants';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar,
    selectInitialChannel
} from 'app/actions/views/channel';
import {connection} from 'app/actions/device';
import {selectFirstAvailableTeam} from 'app/actions/views/select_team';
import {getTheme} from 'app/selectors/preferences';

import Channel from './channel';

function mapStateToProps(state) {
    const {myChannels: channelsRequest} = state.requests.channels;

    return {
        currentTeamId: getCurrentTeamId(state),
        currentChannelId: getCurrentChannelId(state),
        theme: getTheme(state),
        channelsRequestFailed: channelsRequest.status === RequestStatus.FAILURE
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            connection,
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            markChannelAsRead,
            selectFirstAvailableTeam,
            selectInitialChannel,
            initWebSocket,
            closeWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
            viewChannel
        }, dispatch)
    };
}

function areStatesEqual(next, prev) {
    // When switching teams
    if (next.entities.teams.currentTeamId !== prev.entities.teams.currentTeamId) {
        return false;
    }

    // When we have a new channel after switching teams
    const prevChannelId = prev.entities.channels.currentChannelId;
    const nextChannelId = next.entities.channels.currentChannelId;
    if (nextChannelId !== prevChannelId) {
        return false;
    }

    // When getting the channels for a team and the request fails
    const prevStatus = prev.requests.channels.myChannels.status;
    const nextStatus = next.requests.channels.myChannels.status;
    if (!nextChannelId && prevStatus === RequestStatus.STARTED && nextStatus === RequestStatus.FAILURE) {
        return false;
    }

    return true;
}

export default connect(mapStateToProps, mapDispatchToProps, null, {pure: true, areStatesEqual})(Channel);
