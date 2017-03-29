// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {View} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';

import ChannelLoader from 'app/components/channel_loader';

export default class LoadTeam extends PureComponent {
    static propTypes = {
        notification: PropTypes.object,
        teams: PropTypes.object.isRequired,
        myMembers: PropTypes.object.isRequired,
        teamsRequest: PropTypes.object.isRequired,
        currentTeam: PropTypes.object,
        actions: PropTypes.shape({
            clearNotification: PropTypes.func.isRequired,
            goToChannelView: PropTypes.func.isRequired,
            goToNotification: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired
        }).isRequired,
        theme: PropTypes.object.isRequired
    };

    static navigationProps = {
        renderBackButton: () => null,
        renderTitleComponent: () => <View style={{flex: 1, backgroundColor: 'blue'}}/>
    }

    componentDidMount() {
        const {notification, currentTeam, myMembers, teams} = this.props;
        const {clearNotification, goToNotification} = this.props.actions;

        if (notification) {
            clearNotification();
            goToNotification(notification);
        } else if (currentTeam) {
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
        return (
            <View style={{flex: 1}}>
                <ChannelLoader theme={this.props.theme}/>
            </View>
        );
    }
}
