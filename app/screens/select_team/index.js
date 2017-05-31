// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleTeamChange} from 'app/actions/views/select_team';

import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {getTeams, joinTeam} from 'mattermost-redux/actions/teams';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getJoinableTeams} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import SelectTeam from './select_team.js';

function mapStateToProps(state, ownProps) {
    const user = getCurrentUser(state);

    function sortTeams(a, b) {
        return a.display_name.localeCompare(b.display_name, user.locale, {numeric: true});
    }

    return {
        teamsRequest: state.requests.teams.getTeams,
        teams: Object.values(getJoinableTeams(state)).sort(sortTeams),
        currentChannelId: getCurrentChannelId(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleTeamChange,
            joinTeam,
            markChannelAsRead
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
