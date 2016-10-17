// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Image, StyleSheet, Text, TextInput, View} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';

import * as loginActions from 'actions/login';
import Button from 'components/button';
import ErrorText from 'components/error_text';
import {GlobalStyles} from 'styles';
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
    login: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class Login extends Component {
    static propTypes = propTypes;
    state = {
        loginId: '',
        password: ''
    };

    componentWillReceiveProps(props) {
        if (this.props.login.status === 'fetching' &&
          props.login.status === 'fetched') {
            Routes.SelectTeam(); // eslint-disable-line new-cap
        }
    }

    signIn() {
        if (this.props.login.status !== 'fetching') {
            const {loginId, password} = this.state;
            this.props.actions.login(loginId, password);
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <Image
                    style={styles.logo}
                    source={logo}
                />
                <Text>{'Mattermost'}</Text>
                <Text>
                    {'All team communication in one place, searchable and accessible anywhere'}
                </Text>
                <TextInput
                    value={this.state.loginId}
                    onChangeText={(loginId) => this.setState({loginId})}
                    style={GlobalStyles.inputBox}
                    placeholder='Email or Username'
                    autoCorrect={false}
                    autoCapitalize='none'
                />
                <TextInput
                    value={this.state.password}
                    onChangeText={(password) => this.setState({password})}
                    style={GlobalStyles.inputBox}
                    placeholder='Password'
                    autoCorrect={false}
                    autoCapitalize='none'
                />
                <Button
                    onPress={() => this.signIn()}
                    text='Sign in'
                />
                <ErrorText error={this.props.login.error}/>
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        login: state.views.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(loginActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
