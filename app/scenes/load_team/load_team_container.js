// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {saveStorage} from 'app/actions/storage';
import {goToChannelView} from 'app/actions/views/load_team';

import {selectTeam} from 'service/actions/teams';
import {init} from 'service/actions/websocket';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import LoadTeam from './load_team.js';

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
            initWebsocket: init
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadTeam);
