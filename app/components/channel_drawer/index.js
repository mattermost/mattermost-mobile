// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {joinChannel, viewChannel, markChannelAsRead} from 'mattermost-redux/actions/channels';
import {getTeams} from 'mattermost-redux/actions/teams';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

import {handleSelectChannel, setChannelDisplayName, setChannelLoading} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';
import {isLandscape, isTablet} from 'app/selectors/device';
import {getTheme} from 'app/selectors/preferences';

import ChannelDrawer from './channel_drawer.js';

function mapStateToProps(state) {
    const {currentUserId} = state.entities.users;

    return {
        currentTeamId: getCurrentTeamId(state),
        currentChannelId: getCurrentChannelId(state),
        currentUserId,
        isLandscape: isLandscape(state),
        isTablet: isTablet(state),
        teamsCount: Object.keys(getTeamMemberships(state)).length,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleSelectChannel,
            joinChannel,
            viewChannel,
            makeDirectChannel,
            markChannelAsRead,
            setChannelDisplayName,
            setChannelLoading
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawer);
