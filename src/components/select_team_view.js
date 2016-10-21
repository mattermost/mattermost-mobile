// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {View, Image} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import Button from 'react-native-button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import _ from 'lodash';

import ErrorText from 'components/error_text';
import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';
import FormattedText from 'components/formatted_text';

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
                <FormattedText
                    style={GlobalStyles.header}
                    id='components.select_team_view.header'
                    defaultMessage='Mattermost'
                />
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='components.select_team_view.subheader'
                    defaultMessage='All team communication in one place, searchable and accessible anywhere'
                />
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='components.select_team_view.yourTeams'
                    defaultMessage='Your teams:'
                />
                {_.map(teams, (team) => (
                    <Button
                        key={team.id}
                        onPress={() => this.props.actions.selectTeam(team)}
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
                ))}
                <ErrorText error={this.props.teams.error}/>
            </View>
        );
    }
}
