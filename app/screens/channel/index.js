// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar,
    selectInitialChannel
} from 'app/actions/views/channel';
import {connection} from 'app/actions/device';
import {selectFirstAvailableTeam} from 'app/actions/views/select_team';
import {getStatusBarHeight} from 'app/selectors/device';
import {getTheme} from 'app/selectors/preferences';

import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates} from 'mattermost-redux/actions/users';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {
    init as initWebSocket,
    close as closeWebSocket
} from 'mattermost-redux/actions/websocket';

import Channel from './channel';

function mapStateToProps(state, ownProps) {
    const {websocket} = state.requests.general;
    const {myChannels: channelsRequest} = state.requests.channels;

    return {
        ...ownProps,
        currentTeamId: getCurrentTeamId(state),
        currentChannelId: getCurrentChannelId(state),
        theme: getTheme(state),
        webSocketRequest: websocket,
        statusBarHeight: getStatusBarHeight(state),
        channelsRequestStatus: channelsRequest.status
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            connection,
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectFirstAvailableTeam,
            selectInitialChannel,
            initWebSocket,
            closeWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
