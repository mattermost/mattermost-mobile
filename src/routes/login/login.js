// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {View, Text, TextInput, Image} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';

import Button from 'components/button';
import FormattedText from 'components/formatted_text';
import ErrorText from 'components/error_text';
import Loading from 'components/loading';
import {GlobalStyles} from 'styles';
import logo from 'images/logo.png';

import {injectIntl, intlShape} from 'react-intl';

class Login extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
        clientConfig: PropTypes.object.isRequired,
        login: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired
    };

    state = {
        loginId: '',
        password: ''
    };

    componentWillMount() {
        this.props.actions.getClientConfig();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.login.status === 'fetching' && nextProps.login.status === 'fetched') {
            Routes.goToSelectTeam();
        }
    }

    signIn = () => {
        if (this.props.login.status !== 'fetching') {
            const {loginId, password} = this.state;
            this.props.actions.login(loginId, password);
        }
    }

    createLoginPlaceholder() {
        const {formatMessage} = this.props.intl;
        const clientConfig = this.props.clientConfig;

        const loginPlaceholders = [];
        if (clientConfig.EnableSignInWithEmail === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.email', defaultMessage: 'Email'}));
        }

        if (clientConfig.EnableSignInWithUsername === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.username', defaultMessage: 'Username'}));
        }

        if (clientConfig.EnableLdap === 'true') { // TODO check if we're licensed once we have that
            if (clientConfig.LdapLoginFieldName) {
                loginPlaceholders.push(clientConfig.LdapLoginFieldName);
            } else {
                loginPlaceholders.push(formatMessage({id: 'login.ldapUsername', defaultMessage: 'AD/LDAP Username'}));
            }
        }

        if (loginPlaceholders.length >= 2) {
            return loginPlaceholders.slice(0, loginPlaceholders.length - 1).join(', ') +
                ` ${formatMessage({id: 'login.or', defaultMessage: 'or'})} ` +
                loginPlaceholders[loginPlaceholders.length - 1];
        } else if (loginPlaceholders.length === 1) {
            return loginPlaceholders[0];
        }

        return '';
    }

    render() {
        if (this.props.clientConfig.loading || this.props.clientConfig.error) {
            return <Loading/>;
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
                <TextInput
                    ref='loginId'
                    value={this.state.loginId}
                    onChangeText={(loginId) => this.setState({loginId})}
                    style={GlobalStyles.inputBox}
                    placeholder={this.createLoginPlaceholder()}
                    autoCorrect={false}
                    autoCapitalize='none'
                    underlineColorAndroid='transparent'
                />
                <TextInput
                    value={this.state.password}
                    onChangeText={(password) => this.setState({password})}
                    style={GlobalStyles.inputBox}
                    placeholder={this.props.intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                    secureTextEntry={true}
                    autoCorrect={false}
                    autoCapitalize='none'
                    underlineColorAndroid='transparent'
                    returnKeyType='go'
                    onSubmitEditing={this.signIn}
                />
                <Button onPress={this.signIn}>
                    <FormattedText
                        id='login.signIn'
                        defaultMessage='Sign in'
                    />
                </Button>
                <ErrorText error={this.props.login.error}/>
            </View>
        );
    }
}

export default injectIntl(Login);
