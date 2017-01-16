// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectTeam} from 'service/actions/teams';
import {init as websocket} from 'service/actions/websocket';
import {saveStorage} from 'app/actions/storage';
import {goToChannelView} from 'app/actions/navigation';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import SelectTeamView from './select_team.js';

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
            goToChannelView,
            saveStorage,
            selectTeam,
            websocket
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeamView);
