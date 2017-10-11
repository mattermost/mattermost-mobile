// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeam, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

import SwitchTeams from './switch_teams';

function mapStateToProps(state, ownProps) {
    return {
        currentTeam: getCurrentTeam(state),
        teamMembers: getTeamMemberships(state),
        theme: getTheme(state),
        ...ownProps
    };
}

export default connect(mapStateToProps)(SwitchTeams);
