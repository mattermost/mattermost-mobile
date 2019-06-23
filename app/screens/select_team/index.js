// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeams, joinTeam} from 'mattermost-redux/actions/teams';
import {logout} from 'mattermost-redux/actions/users';
import {getJoinableTeams} from 'mattermost-redux/selectors/entities/teams';

import {resetToChannel, dismissModal} from 'app/actions/navigation';
import {handleTeamChange} from 'app/actions/views/select_team';

import SelectTeam from './select_team.js';

function mapStateToProps(state) {
    return {
        teamsRequest: state.requests.teams.getTeams,
        teams: getJoinableTeams(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleTeamChange,
            joinTeam,
            logout,
            resetToChannel,
            dismissModal,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
