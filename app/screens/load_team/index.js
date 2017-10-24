// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeams} from 'mattermost-redux/actions/teams';
import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';

import {handleTeamChange} from 'app/actions/views/select_team';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import LoadTeam from './load_team';

function mapStateToProps(state) {
    return {
        config: state.entities.general.config,
        theme: getTheme(state),
        teams: state.entities.teams.teams,
        currentTeam: getCurrentTeam(state),
        myMembers: state.entities.teams.myMembers,
        notification: state.views.notification
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleTeamChange
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadTeam);
