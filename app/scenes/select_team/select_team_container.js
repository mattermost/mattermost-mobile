// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as teamActions from 'service/actions/teams';
import {init as websocket} from 'service/actions/websocket';
import * as storageActions from 'app/actions/storage';
import {goToChannelView} from 'app/actions/navigation';

import SelectTeamView from './select_team.js';

function mapStateToProps(state) {
    return {
        config: state.entities.general.config,
        teamsRequest: state.requests.teams.allTeams,
        teams: state.entities.teams.teams,
        myMembers: state.entities.teams.myMembers
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToChannelView,
            ...storageActions,
            ...teamActions,
            websocket
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeamView);
