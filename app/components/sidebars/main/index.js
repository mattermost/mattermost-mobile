// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {joinChannel} from 'mattermost-redux/actions/channels';
import {getTeams} from 'mattermost-redux/actions/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId, getMyTeamsCount} from 'mattermost-redux/selectors/entities/teams';

import {setChannelDisplayName, setChannelLoading} from 'app/actions/views/channel';
import {makeDirectChannel} from 'app/actions/views/more_dms';
import {isLandscape, isTablet, getDimensions} from 'app/selectors/device';
import telemetry from 'app/telemetry';

import MainSidebar from './main_sidebar.js';

export function logChannelSwitch(channelId, currentChannelId) {
    return (dispatch, getState) => {
        if (channelId === currentChannelId) {
            return;
        }

        const metrics = [];
        if (getState().entities.posts.postsInChannel[channelId]) {
            metrics.push('channel:switch_loaded');
        } else {
            metrics.push('channel:switch_initial');
        }

        telemetry.reset();
        telemetry.start(metrics);
    };
}

function mapStateToProps(state) {
    const {currentUserId} = state.entities.users;

    return {
        ...getDimensions(state),
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
            joinChannel,
            logChannelSwitch,
            makeDirectChannel,
            setChannelDisplayName,
            setChannelLoading,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(MainSidebar);
