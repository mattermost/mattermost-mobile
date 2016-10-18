// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as teamActions from 'actions/teams';
import SelectTeamView from 'components/select_team_view';

function mapStateToProps(state) {
    return {
        teams: state.entities.teams
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(teamActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeamView);
