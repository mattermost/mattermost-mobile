// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {View, Text, TextInput, Image} from 'react-native';

import Button from 'app/components/button';
import FormattedText from 'app/components/formatted_text';
import ErrorText from 'app/components/error_text';
import Loading from 'app/components/loading';
import {GlobalStyles} from 'app/styles';
import logo from 'app/images/logo.png';

import {injectIntl, intlShape} from 'react-intl';

import {RequestStatus} from 'service/constants';

class Login extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        loginId: PropTypes.string.isRequired,
        password: PropTypes.string.isRequired,
        loginRequest: PropTypes.object.isRequired,
        configRequest: PropTypes.object.isRequired,
        licenseRequest: PropTypes.object.isRequired
    };

    componentWillMount() {
        this.props.actions.getClientConfig();
        this.props.actions.getLicenseConfig();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.loginRequest.status === RequestStatus.STARTED && nextProps.loginRequest.status === RequestStatus.SUCCESS) {
            this.props.actions.saveStorage().then(this.props.actions.goToSelectTeam);
        }
    }

    signIn() {
        if (this.props.loginRequest.status !== RequestStatus.STARTED) {
            this.props.actions.login(this.props.loginId, this.props.password);
        }
    }

    createLoginPlaceholder() {
        const {formatMessage} = this.props.intl;
        const license = this.props.license;
        const config = this.props.config;

        const loginPlaceholders = [];
        if (config.EnableSignInWithEmail === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.email', defaultMessage: 'Email'}));
        }

        if (config.EnableSignInWithUsername === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.username', defaultMessage: 'Username'}));
        }

        if (license.IsLicensed === 'true' && license.LDAP === 'true' && config.EnableLdap === 'true') {
            if (config.LdapLoginFieldName) {
                loginPlaceholders.push(config.LdapLoginFieldName);
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
        if (this.props.configRequest.status === RequestStatus.STARTED || this.props.licenseRequest.status === RequestStatus.STARTED) {
            return <Loading/>;
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
                <TextInput
                    ref='loginId'
                    value={this.props.loginId}
                    onChangeText={this.props.actions.handleLoginIdChanged}
                    style={GlobalStyles.inputBox}
                    placeholder={this.createLoginPlaceholder()}
                    autoCorrect={false}
                    autoCapitalize='none'
                    underlineColorAndroid='transparent'
                />
                <TextInput
                    value={this.props.password}
                    onChangeText={this.props.actions.handlePasswordChanged}
                    style={GlobalStyles.inputBox}
                    placeholder={this.props.intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                    secureTextEntry={true}
                    autoCorrect={false}
                    autoCapitalize='none'
                    underlineColorAndroid='transparent'
                    returnKeyType='go'
                    onSubmitEditing={this.signIn.bind(this)}
                />
                <Button onPress={this.signIn.bind(this)}>
                    <FormattedText
                        id='login.signIn'
                        defaultMessage='Sign in'
                    />
                </Button>
                <ErrorText error={this.props.loginRequest.error}/>
            </View>
        );
    }
}

export default injectIntl(Login);
