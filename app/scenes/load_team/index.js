// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';

import {goToChannelView} from 'app/actions/views/load_team';
import {clearNotification, goToNotification} from 'app/actions/views/root';
import {handleTeamChange} from 'app/actions/views/select_team';
import {getTheme} from 'app/selectors/preferences';

import navigationSceneConnect from '../navigationSceneConnect';

import LoadTeam from './load_team';

function mapStateToProps(state) {
    return {
        config: state.entities.general.config,
        theme: getTheme(state),
        teamsRequest: state.requests.teams.getMyTeams,
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

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(LoadTeam);
