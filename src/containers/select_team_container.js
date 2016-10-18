// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Actions as Routes} from 'react-native-router-flux';
import * as teamActions from 'actions/teams';
import SelectTeamView from 'components/select_team_view';

const propTypes = {
    teams: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class SelectTeamContainer extends Component {
    static propTypes = propTypes;

    componentWillMount() {
        this.props.actions.fetchTeams();
    }

    componentWillReceiveProps(props) {
        if (props.teams.currentTeamId && !this.props.teams.currentTeamId) {
            Routes.goToChannelsListContainer();
        }
    }

    render() {
        return (
            <SelectTeamView
                teams={this.props.teams}
                actions={this.props.actions}
            />
        );
    }
}

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

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeamContainer);
