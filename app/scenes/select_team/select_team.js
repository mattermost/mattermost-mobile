// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {View, Image, Text} from 'react-native';
import Button from 'react-native-button';
import Icon from 'react-native-vector-icons/MaterialIcons';

import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

export default class SelectTeam extends React.Component {
    static propTypes = {
        config: React.PropTypes.object.isRequired,
        teams: React.PropTypes.object.isRequired,
        myMembers: React.PropTypes.object.isRequired,
        actions: React.PropTypes.shape({
            goBackToChannelView: React.PropTypes.func.isRequired,
            handleTeamChange: React.PropTypes.func.isRequired
        }).isRequired
    };

    onSelectTeam(team) {
        this.props.actions.handleTeamChange(team).then(this.props.actions.goBackToChannelView);
    }

    render() {
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
            </View>
        );
    }
}
