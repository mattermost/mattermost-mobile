// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {StatusBar, View} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';

import ChannelLoader from 'app/components/channel_loader';

export default class LoadTeam extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object,
        notification: PropTypes.object,
        teams: PropTypes.object.isRequired,
        myMembers: PropTypes.object.isRequired,
        teamsRequest: PropTypes.object.isRequired,
        currentTeam: PropTypes.object,
        actions: PropTypes.shape({
            clearNotification: PropTypes.func.isRequired,
            goToNotification: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired,
            initialize: PropTypes.func.isRequired
        }).isRequired,
        theme: PropTypes.object.isRequired
    };

    componentDidMount() {
        const {notification, currentTeam, myMembers, teams} = this.props;
        const {clearNotification, goToNotification} = this.props.actions;

        if (notification) {
            clearNotification();
            goToNotification(notification);
            this.goToChannelView();
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
        const {handleTeamChange} = this.props.actions;
        handleTeamChange(team).then(this.goToChannelView);
    }

    goToChannelView = () => {
        const {actions, navigator, theme} = this.props;

        actions.initialize();
        navigator.resetTo({
            screen: 'Channel',
            animated: false,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    render() {
        return (
            <View style={{flex: 1}}>
                <StatusBar barStyle='light-content'/>
                <ChannelLoader theme={this.props.theme}/>
            </View>
        );
    }
}
