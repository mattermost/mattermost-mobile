// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Image, StyleSheet, Picker, View} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import _ from 'lodash';

import * as teamActions from 'actions/teams';
import ErrorText from 'components/error_text';
import logo from 'images/logo.png';

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

    componentWillMount() {
        this.props.actions.fetchTeams();
    }

    componentWillReceiveProps(props) {
        if (props.teams.current_team_id && !this.props.teams.current_team_id) {
            Routes.ChannelsList(); // eslint-disable-line new-cap
        }
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
                    onValueChange={(team) => {
                        this.props.actions.selectTeam(team);
                    }}
                >
                    {_.map(this.props.teams.data, (team) => (
                        <Picker.Item
                            key={team.id}
                            label={team.display_name}
                            value={team}
                        />
                    ))}
                </Picker>

                <ErrorText error={this.props.teams.error}/>
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        teams: state.entities.teams
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(teamActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
