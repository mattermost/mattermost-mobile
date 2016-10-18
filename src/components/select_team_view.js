// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {View, Text, Image} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import Button from 'react-native-button';
import _ from 'lodash';

import ErrorText from 'components/error_text';
import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';

const propTypes = {
    teams: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

export default class SelectTeamView extends Component {
    static propTypes = propTypes;

    componentWillMount() {
        this.props.actions.fetchTeams();
    }

    componentWillReceiveProps(props) {
        const {currentTeamId} = props.teams;
        if (currentTeamId &&
          currentTeamId !== this.props.teams.currentTeamId) {
            Routes.goToChannelsList();
        }
    }

    render() {
        const teams = _.values(this.props.teams.data);
        return (
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <Text style={GlobalStyles.header}>
                    {'Mattermost'}
                </Text>
                <Text style={GlobalStyles.subheader}>
                    {'All team communication in one place, searchable and accessible anywhere'}
                </Text>
                <Text style={GlobalStyles.subheader}>
                    {'Your teams:'}
                </Text>
                {_.map(teams, (team) => (
                    <Button
                        key={team.id}
                        onPress={() => this.props.actions.selectTeam(team)}
                        style={GlobalStyles.buttonListItemText}
                        containerStyle={GlobalStyles.buttonListItem}
                    >
                        {team.display_name}
                    </Button>
                ))}
                <ErrorText error={this.props.teams.error}/>
            </View>
        );
    }
}
