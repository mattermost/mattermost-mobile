// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {joinChannel, markChannelAsRead, markChannelAsViewed} from 'mattermost-redux/actions/channels';
import {getTeams} from 'mattermost-redux/actions/teams';
import {getCurrentTeamId, getMyTeamsCount} from 'mattermost-redux/selectors/entities/teams';

import {handleSelectChannel, setChannelDisplayName, setChannelLoading} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';
import {isLandscape, isTablet} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelDrawer from './channel_drawer.js';

function mapStateToProps(state) {
    const {currentUserId} = state.entities.users;

    return {
        currentTeamId: getCurrentTeamId(state),
        currentUserId,
        isLandscape: isLandscape(state),
        isTablet: isTablet(state),
        teamsCount: getMyTeamsCount(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleSelectChannel,
            joinChannel,
            markChannelAsViewed,
            makeDirectChannel,
            markChannelAsRead,
            setChannelDisplayName,
            setChannelLoading,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(ChannelDrawer);
