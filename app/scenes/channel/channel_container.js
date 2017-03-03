// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {
    goToChannelInfo,
    openChannelDrawer,
    openRightMenuDrawer
} from 'app/actions/navigation';
import {
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar,
    selectInitialChannel,
    handlePostDraftChanged
} from 'app/actions/views/channel';
import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates} from 'service/actions/users';
import {selectFirstAvailableTeam} from 'app/actions/views/select_team';

import {getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import {
    init as initWebSocket,
    close as closeWebSocket
} from 'service/actions/websocket';

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
            openRightMenuDrawer,
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
