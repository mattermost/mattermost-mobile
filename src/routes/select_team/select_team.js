// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {View, Image, Text} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import Button from 'react-native-button';
import Loading from 'components/loading.js';
import Icon from 'react-native-vector-icons/MaterialIcons';

import ErrorText from 'components/error_text';
import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';
import FormattedText from 'components/formatted_text';

export default class SelectTeam extends Component {
    static propTypes = {
        clientConfig: PropTypes.object.isRequired,
        teams: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired
    };

    componentWillMount() {
        this.props.actions.fetchTeams();
    }

    onSelectTeam(team) {
        Routes.goToMain({currentTeamId: team.id});
    }

    render() {
        if (this.props.teams.status !== 'fetched') {
            return <Loading/>;
        }

        const teams = [];
        for (const id of Object.keys(this.props.teams.data)) {
            const team = this.props.teams.data[id];

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

        return (
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <Text style={GlobalStyles.header}>
                    {this.props.clientConfig.SiteName}
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
                <ErrorText error={this.props.teams.error}/>
            </View>
        );
    }
}
