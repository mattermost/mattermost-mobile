// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {
    goToChannelInfo,
    openChannelDrawer
} from 'app/actions/navigation';
import {
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar,
    selectInitialChannel,
    handlePostDraftChanged
} from 'app/actions/views/channel';
import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates} from 'mattermost-redux/actions/users';
import {selectFirstAvailableTeam} from 'app/actions/views/select_team';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'app/selectors/preferences';
import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';

import {
    init as initWebSocket,
    close as closeWebSocket
} from 'mattermost-redux/actions/websocket';

import Channel from './channel';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        ...state.views.channel,
        currentTeam: getCurrentTeam(state),
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectFirstAvailableTeam,
            selectInitialChannel,
            openChannelDrawer,
            handlePostDraftChanged,
            goToChannelInfo,
            initWebSocket,
            closeWebSocket,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Channel);
