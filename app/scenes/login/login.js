// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Image,
    KeyboardAvoidingView,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import Button from 'react-native-button';
import FormattedText from 'app/components/formatted_text';
import ErrorText from 'app/components/error_text';
import Loading from 'app/components/loading';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

import {RequestStatus} from 'service/constants';

class Login extends Component {
    static propTypes = {
        intl: intlShape.isRequired,
        actions: React.PropTypes.shape({
            handleLoginIdChanged: React.PropTypes.func.isRequired,
            handlePasswordChanged: React.PropTypes.func.isRequired,
            handleSuccessfulLogin: React.PropTypes.func.isRequired,
            checkMfa: React.PropTypes.func.isRequired,
            login: React.PropTypes.func.isRequired,
            getClientConfig: React.PropTypes.func.isRequired,
            getLicenseConfig: React.PropTypes.func.isRequired,
            goToMfa: React.PropTypes.func.isRequired,
            goToLoadTeam: React.PropTypes.func.isRequired
        }).isRequired,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        loginId: PropTypes.string.isRequired,
        password: PropTypes.string.isRequired,
        checkMfaRequest: PropTypes.object.isRequired,
        loginRequest: PropTypes.object.isRequired,
        configRequest: PropTypes.object.isRequired,
        licenseRequest: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null
        };
    }

    componentWillMount() {
        this.props.actions.getClientConfig();
        this.props.actions.getLicenseConfig();
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.loginRequest.status === RequestStatus.STARTED && nextProps.loginRequest.status === RequestStatus.SUCCESS) {
            this.props.actions.handleSuccessfulLogin().then(this.props.actions.goToLoadTeam);
        }
    }

    blur = () => {
        this.loginId.blur();
        this.passwd.blur();
    };

    preSignIn = () => {
        this.setState({error: null});
        if (!this.props.loginId) {
            // it's slightly weird to be constructing the message ID, but it's a bit nicer than triply nested if statements
            let msgId = 'login.no';
            if (this.props.config.EnableSignInWithEmail === 'true') {
                msgId += 'Email';
            }
            if (this.props.config.EnableSignInWithUsername === 'true') {
                msgId += 'Username';
            }
            if (this.props.license.IsLicensed === 'true' && this.props.config.EnableLdap === 'true') {
                msgId += 'LdapUsername';
            }

            this.setState({
                error: {
                    id: msgId,
                    defaultMessage: '',
                    values: {
                        ldapUsername: this.props.config.LdapLoginFieldName ||
                            this.props.intl.formatMessage({id: 'login.ldapUsernameLower', defaultMessage: 'AD/LDAP username'})
                    }
                }
            });
            return;
        }

        if (!this.props.password) {
            this.setState({
                error: {id: 'login.noPassword', defaultMessage: 'Please enter your password'}
            });
            return;
        }
        if (this.props.config.EnableMultifactorAuthentication === 'true') {
            this.props.actions.checkMfa(this.props.loginId).then((result) => {
                if (result.mfa_required === 'true') {
                    this.props.actions.goToMfa();
                } else {
                    this.signIn();
                }
            });
        } else {
            this.signIn();
        }
    };

    signIn = () => {
        if (this.props.loginRequest.status !== RequestStatus.STARTED) {
            this.props.actions.login(this.props.loginId, this.props.password);
        }
    };

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
            <KeyboardAvoidingView
                behavior='padding'
                style={{flex: 1}}
                keyboardVerticalOffset={65}
            >
                <TouchableWithoutFeedback onPress={this.blur}>
                    <View style={[GlobalStyles.container, GlobalStyles.signupContainer]}>
                        <Image
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
                        <ErrorText error={this.props.loginRequest.error || this.props.checkMfaRequest.error || this.state.error}/>
                        <TextInput
                            ref={(ref) => {
                                this.loginId = ref;
                            }}
                            value={this.props.loginId}
                            onChangeText={this.props.actions.handleLoginIdChanged}
                            style={GlobalStyles.inputBox}
                            placeholder={this.createLoginPlaceholder()}
                            autoCorrect={false}
                            autoCapitalize='none'
                            keyboardType='email-address'
                            returnKeyType='next'
                            underlineColorAndroid='transparent'
                            onSubmitEditing={() => {
                                this.passwd.focus();
                            }}
                        />
                        <TextInput
                            ref={(ref) => {
                                this.passwd = ref;
                            }}
                            value={this.props.password}
                            onChangeText={this.props.actions.handlePasswordChanged}
                            style={GlobalStyles.inputBox}
                            placeholder={this.props.intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                            secureTextEntry={true}
                            autoCorrect={false}
                            autoCapitalize='none'
                            underlineColorAndroid='transparent'
                            returnKeyType='go'
                            onSubmitEditing={this.preSignIn}
                        />
                        <Button
                            onPress={this.preSignIn}
                            containerStyle={GlobalStyles.signupButton}
                        >
                            <FormattedText
                                id='login.signIn'
                                defaultMessage='Sign in'
                                style={GlobalStyles.signupButtonText}
                            />
                        </Button>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        );
    }
}

export default injectIntl(Login);
