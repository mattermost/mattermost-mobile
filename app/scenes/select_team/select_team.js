// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {View, Image, Text} from 'react-native';
import Button from 'react-native-button';
import Icon from 'react-native-vector-icons/MaterialIcons';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

import {RequestStatus} from 'service/constants';

export default class SelectTeam extends Component {
    static propTypes = {
        config: PropTypes.object.isRequired,
        teams: PropTypes.object.isRequired,
        myMembers: PropTypes.object.isRequired,
        teamsRequest: PropTypes.object.isRequired,
        currentTeam: PropTypes.object,
        actions: PropTypes.object.isRequired
    };

    componentWillMount() {
        this.props.actions.websocket();
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
        if (this.props.teamsRequest.status === RequestStatus.STARTED) {
            return <Loading/>;
        }

        const teams = [];
        for (const id of Object.keys(this.props.teams)) {
            const team = this.props.teams[id];

            if (this.props.myMembers.hasOwnProperty(id)) {
                teams.push(
                    <Button
                        key={id}
                        onPress={() => this.onSelectTeam(team)}
                        style={GlobalStyles.buttonListItemText}
                        containerStyle={GlobalStyles.buttonListItem}
                    >
                        {team.display_name}
                        <Icon
                            name='keyboard-arrow-right'
                            size={24}
                            color='#777'
                        />
                    </Button>
                );
            }
        }

        return (
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <Text style={GlobalStyles.header}>
                    {this.props.config.SiteName}
                </Text>
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='web.root.signup_info'
                    defaultMessage='All team communication in one place, searchable and accessible anywhere'
                />
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='signup_team.choose'
                    defaultMessage='Your teams:'
                />
                {teams}
                <ErrorText error={this.props.teamsRequest.error}/>
            </View>
        );
    }
}
