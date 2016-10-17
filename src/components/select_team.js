// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';

import Client from 'client/client_instance';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as team_actions from 'actions/teams';

import _ from 'lodash';
import Button from './button';
import {Image, StyleSheet, Text, TextInput, View} from 'react-native';
import KeyboardSpacer from 'react-native-keyboard-spacer';
import {Actions as Routes} from 'react-native-router-flux';

import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';
import ErrorText from './error_text';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 200,
        backgroundColor: 'white'
    },

    logo: {
        marginBottom: 10
    }
});

class SelectTeam extends Component {
    static propTypes = {
        onProceed: React.PropTypes.func.isRequired,
        getPing: React.PropTypes.func.isRequired,
        ping: React.PropTypes.object.isRequired,
        device: React.PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);

        this.state = {
            serverUrl: 'http://localhost:8065'
        };
    }

    componentWillMount() {
      this.props.actions.fetchTeams();
    }

    render() {
        return (
            <View style={styles.container}>
                <Image
                    style={styles.logo}
                    source={logo}
                />
              {_.map(this.props.teams.data, (team) => (
                <Text>{team.display_name}</Text>
              ))}

                <ErrorText error={this.props.teams.error}/>
                <KeyboardSpacer/>
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        teams: state.entities.teams,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(team_actions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
