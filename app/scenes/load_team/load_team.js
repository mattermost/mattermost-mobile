// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import Loading from 'app/components/loading';

import {RequestStatus} from 'service/constants';

export default class LoadTeam extends React.Component {
    static propTypes = {
        teams: React.PropTypes.object.isRequired,
        myMembers: React.PropTypes.object.isRequired,
        teamsRequest: React.PropTypes.object.isRequired,
        currentTeam: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goToChannelView: React.PropTypes.func.isRequired,
            handleTeamChange: React.PropTypes.func.isRequired,
            initWebsocket: React.PropTypes.func.isRequired
        }).isRequired
    };

    componentWillMount() {
        this.props.actions.initWebsocket();
    }

    componentDidMount() {
        const {currentTeam, myMembers, teams} = this.props;

        if (currentTeam) {
            this.onSelectTeam(currentTeam);
        } else if (!currentTeam) {
            this.selectFirstTeam(teams, myMembers);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.teamsRequest.status === RequestStatus.STARTED &&
            nextProps.teamsRequest.status === RequestStatus.SUCCESS) {
            this.selectFirstTeam(nextProps.teams, nextProps.myMembers);
        }
    }

    selectFirstTeam(allTeams, myMembers) {
        const teams = Object.keys(myMembers).map((key) => allTeams[key]);
        const firstTeam = Object.values(teams).sort((a, b) => a.display_name.localeCompare(b.display_name))[0];

        if (firstTeam) {
            this.onSelectTeam(firstTeam);
        }
    }

    onSelectTeam(team) {
        this.props.actions.handleTeamChange(team).then(this.props.actions.goToChannelView);
    }

    render() {
        return <Loading/>;
    }
}
