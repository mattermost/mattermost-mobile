// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToChannelView} from 'app/actions/views/load_team';
import {clearNotification, goToNotification} from 'app/actions/views/root';
import {handleTeamChange} from 'app/actions/views/select_team';
import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';

import LoadTeam from './load_team.js';

function mapStateToProps(state) {
    return {
        config: state.entities.general.config,
        teamsRequest: state.requests.teams.allTeams,
        teams: state.entities.teams.teams,
        currentTeam: getCurrentTeam(state),
        myMembers: state.entities.teams.myMembers,
        notification: state.views.notification
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearNotification,
            goToChannelView,
            goToNotification,
            handleTeamChange
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadTeam);
