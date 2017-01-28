// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

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
            selectInitialChannel,
            openChannelDrawer,
            openRightMenuDrawer,
            handlePostDraftChanged,
            goToChannelInfo,
            initWebSocket,
            closeWebSocket
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
