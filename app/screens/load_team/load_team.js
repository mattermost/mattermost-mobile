// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';

export default class LoadTeam extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearNotification: PropTypes.func.isRequired,
            getTeams: PropTypes.func.isRequired,
            goToNotification: PropTypes.func.isRequired,
            handleTeamChange: PropTypes.func.isRequired,
            initialize: PropTypes.func.isRequired
        }).isRequired,
        currentTeam: PropTypes.object,
        myMembers: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        notification: PropTypes.object,
        teams: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    componentDidMount() {
        const {notification, currentTeam, myMembers, teams} = this.props;
        const {clearNotification, goToNotification} = this.props.actions;

        if (notification) {
            clearNotification();
            goToNotification(notification);
            return this.goToChannelView();
        }

        if (currentTeam && myMembers[currentTeam.id]) {
            return this.onSelectTeam(currentTeam);
        }

        return this.selectFirstTeam(teams, myMembers);
    }

    selectFirstTeam(allTeams, myMembers) {
        const teams = Object.keys(myMembers).map((key) => allTeams[key]);
        const firstTeam = Object.values(teams).sort((a, b) => a.display_name.localeCompare(b.display_name))[0];

        if (firstTeam) {
            this.onSelectTeam(firstTeam);
        } else {
            const {getTeams} = this.props.actions;
            getTeams().then(() => {
                EventEmitter.emit(NavigationTypes.NAVIGATION_NO_TEAMS);
            });
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
        return null;
    }
}
