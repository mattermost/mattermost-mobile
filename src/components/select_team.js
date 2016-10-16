// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as team_actions from 'actions/teams';

import _ from 'lodash';
import {Image, StyleSheet, Picker, View} from 'react-native';
import KeyboardSpacer from 'react-native-keyboard-spacer';

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

const propTypes = {
    teams: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class SelectTeam extends Component {
    static propTypes = propTypes;

    constructor(props) {
        super(props);

        this.state = {
            serverUrl: 'http://localhost:8065',
            team: null
        };
    }

    componentWillMount() {
      this.props.actions.fetchTeams();
    }

    setTeam(team) {
        this.setState({team: team});
        console.warn(team.display_name);
    }

    render() {
        return (
            <View style={styles.container}>
                <Image
                    style={styles.logo}
                    source={logo}
                />
                <Picker
                  style={{width: 300}}
                  selectedValue={this.state.team}
                  onValueChange={(team) => this.setTeam(team)}>
                    {_.map(this.props.teams.data, (team) => (
                        <Picker.Item label={team.display_name} value={team} />
                    ))}
                </Picker>

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
