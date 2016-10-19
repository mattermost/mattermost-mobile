// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {View, TextInput, Image} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';

import Button from 'components/button';
import FormattedText from 'components/formatted_text';
import ErrorText from 'components/error_text';
import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';

import {injectIntl, intlShape} from 'react-intl';

const propTypes = {
    intl: intlShape.isRequired,
    login: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class LoginView extends Component {
    static propTypes = propTypes;
    state = {
        loginId: '',
        password: ''
    };

    componentWillReceiveProps(props) {
        if (this.props.login.status === 'fetching' &&
          props.login.status === 'fetched') {
            Routes.goToSelectTeam();
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
            <View style={GlobalStyles.container}>
                <Image
                    style={GlobalStyles.logo}
                    source={logo}
                />
                <FormattedText
                    style={GlobalStyles.header}
                    id='components.login_view.header'
                    defaultMessage='Mattermost'
                />
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='components.login_view.subheader'
                    defaultMessage='All team communication in one place, searchable and accessible anywhere'
                />
                <TextInput
                    value={this.state.loginId}
                    onChangeText={(loginId) => this.setState({loginId})}
                    style={GlobalStyles.inputBox}
                    placeholder={this.props.intl.formatMessage({id: 'components.login_view.loginIdPlaceholder', defaultMessage: 'Email or Username'})}
                    autoCorrect={false}
                    autoCapitalize='none'
                    underlineColorAndroid='transparent'
                />
                <TextInput
                    value={this.state.password}
                    onChangeText={(password) => this.setState({password})}
                    style={GlobalStyles.inputBox}
                    placeholder={this.props.intl.formatMessage({id: 'components.login_view.passwordPlaceholder', defaultMessage: 'Password'})}
                    autoCorrect={false}
                    autoCapitalize='none'
                    underlineColorAndroid='transparent'
                />
                <Button onPress={() => this.signIn()}>
                    <FormattedText
                        id='components.login_view.signIn'
                        defaultMessage='Sign in'
                    />
                </Button>
                <ErrorText error={this.props.login.error}/>
            </View>
        );
    }
}

export default injectIntl(LoginView);
