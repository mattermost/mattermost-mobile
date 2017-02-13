// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goBack, closeDrawers} from 'app/actions/navigation';
import {handleTeamChange} from 'app/actions/views/select_team';

import {getCurrentTeam} from 'service/selectors/entities/teams';

import SelectTeam from './select_team.js';

function mapStateToProps(state) {
    return {
        config: state.entities.general.config,
        teamsRequest: state.requests.teams.allTeams,
        teams: state.entities.teams.teams,
        currentTeam: getCurrentTeam(state),
        myMembers: state.entities.teams.myMembers
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBackToChannelView: goBack,
            closeDrawers,
            handleTeamChange
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(SelectTeam);
