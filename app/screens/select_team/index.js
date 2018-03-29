// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleTeamChange} from 'app/actions/views/select_team';

import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {getTeams, joinTeam} from 'mattermost-redux/actions/teams';
import {logout} from 'mattermost-redux/actions/users';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getJoinableTeams} from 'mattermost-redux/selectors/entities/teams';

import {getCurrentLocale} from 'app/selectors/i18n';

import SelectTeam from './select_team.js';

function mapStateToProps(state) {
    const locale = getCurrentLocale(state);

    function sortTeams(a, b) {
        const options = {
            numeric: true,
            sensitivity: 'base',
        };
        return a.display_name.localeCompare(b.display_name, locale, options);
    }

    return {
        teamsRequest: state.requests.teams.getMyTeams,
        teams: Object.values(getJoinableTeams(state)).sort(sortTeams),
        currentChannelId: getCurrentChannelId(state),
        joinTeamRequest: state.requests.teams.joinTeam,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleTeamChange,
            joinTeam,
            logout,
            markChannelAsRead,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
