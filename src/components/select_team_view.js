// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {Image, StyleSheet, Text, View} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import _ from 'lodash';
import Button from 'react-native-button';

import ErrorText from 'components/error_text';
import logo from 'images/logo.png';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingVertical: 100,
        backgroundColor: 'white'
    },
    logo: {
        marginBottom: 10
    },
    header: {
        fontSize: 36,
        fontWeight: '600'
    },
    subheader: {
        fontSize: 18,
        fontWeight: '300',
        color: '#777'
    },
    button: {
        textAlign: 'left',
        fontSize: 18,
        fontWeight: '400',
        color: '#777'
    },
    buttonContainer: {
        alignSelf: 'stretch',
        height: 50,
        marginHorizontal: 15,
        marginVertical: 5,
        padding: 13,
        backgroundColor: '#fafafa',
        borderWidth: 1,
        borderRadius: 3,
        borderColor: '#d5d5d5'
    }
});

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
            <View style={styles.container}>
                <Image
                    style={styles.logo}
                    source={logo}
                />
                <Text style={styles.header}>{'Mattermost'}</Text>
                <Text style={styles.subheader}>
                    {'All team communication in one place, searchable and accessible anywhere'}
                </Text>
                <Text style={styles.subheader}>
                    {'Your teams:'}
                </Text>
                {_.map(teams, (team) => (
                    <Button
                        key={team.id}
                        onPress={() => this.props.actions.selectTeam(team)}
                        style={styles.button}
                        containerStyle={styles.buttonContainer}
                    >
                        {team.display_name}
                    </Button>
                ))}
                <ErrorText error={this.props.teams.error}/>
            </View>
        );
    }
}
