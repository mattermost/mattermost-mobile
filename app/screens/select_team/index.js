// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleTeamChange} from 'app/actions/views/select_team';

import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeam, getTeams, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import SelectTeam from './select_team.js';

function mapStateToProps(state, ownProps) {
    const allTeams = Object.values(getTeams(state));
    const myMembers = getTeamMemberships(state);
    const user = getCurrentUser(state);
    const myTeams = allTeams.filter((team) => myMembers.hasOwnProperty(team.id));

    function sortTeams(a, b) {
        return a.display_name.localeCompare(b.display_name, user.locale, {numeric: true});
    }

    return {
        ...ownProps,
        config: state.entities.general.config,
        teamsRequest: state.requests.teams.allTeams,
        teams: myTeams.sort(sortTeams),
        currentTeam: getCurrentTeam(state),
        currentChannelId: getCurrentChannelId(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleTeamChange,
            markChannelAsRead
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
