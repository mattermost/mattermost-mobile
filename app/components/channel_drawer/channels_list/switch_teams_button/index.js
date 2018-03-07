// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeam, getMyTeamsCount, getChannelDrawerBadgeCount} from 'mattermost-redux/selectors/entities/teams';

import SwitchTeamsButton from './switch_teams_button';

function mapStateToProps(state) {
    const team = getCurrentTeam(state);

    return {
        currentTeamId: team.id,
        mentionCount: getChannelDrawerBadgeCount(state),
        teamsCount: getMyTeamsCount(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(SwitchTeamsButton);
