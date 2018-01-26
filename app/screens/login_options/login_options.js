// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text
} from 'react-native';
import Button from 'react-native-button';
import Orientation from 'react-native-orientation';

import {ViewTypes} from 'app/constants';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {GlobalStyles} from 'app/styles';
import {preventDoubleTap} from 'app/utils/tap';

import LocalConfig from 'assets/config';
import gitlab from 'assets/images/gitlab.png';
import logo from 'assets/images/logo.png';

class LoginOptions extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        theme: PropTypes.object
    };

    componentWillMount() {
        Orientation.addOrientationListener(this.orientationDidChange);
    }

    componentWillUnmount() {
        Orientation.removeOrientationListener(this.orientationDidChange);
    }

    goToLogin = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'Login',
            title: intl.formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    goToSSO = (ssoType) => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'SSO',
            title: intl.formatMessage({id: 'mobile.routes.sso', defaultMessage: 'Single Sign-On'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                ssoType
            }
        });
    };

    orientationDidChange = () => {
        this.scroll.scrollTo({x: 0, y: 0, animated: true});
    };

    renderEmailOption = () => {
        const {config} = this.props;
        const forceHideFromLocal = LocalConfig.HideEmailLoginExperimental;

        if (!forceHideFromLocal && (config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true')) {
            const backgroundColor = config.EmailLoginButtonColor || '#2389d7';
            const additionalStyle = {
                backgroundColor
            };

            if (config.hasOwnProperty('EmailLoginButtonBorderColor')) {
                additionalStyle.borderColor = config.EmailLoginButtonBorderColor;
            }

            const textColor = config.EmailLoginButtonTextColor || 'white';

            return (
                <Button
                    key='email'
                    onPress={() => preventDoubleTap(this.goToLogin, this)}
                    containerStyle={[GlobalStyles.signupButton, additionalStyle]}
                >
                    <FormattedText
                        id='signup.email'
                        defaultMessage='Email and Password'
                        style={[GlobalStyles.signupButtonText, {color: textColor}]}
                    />
                </Button>
            );
        }

        return null;
    };

    renderLdapOption = () => {
        const {config, license} = this.props;
        const forceHideFromLocal = LocalConfig.HideLDAPLoginExperimental;

        if (!forceHideFromLocal && license.IsLicensed === 'true' && config.EnableLdap === 'true') {
            const backgroundColor = config.LDAPLoginButtonColor || '#2389d7';
            const additionalStyle = {
                backgroundColor
            };

            if (config.hasOwnProperty('LDAPLoginButtonBorderColor')) {
                additionalStyle.borderColor = config.LDAPLoginButtonBorderColor;
            }

            const textColor = config.LDAPLoginButtonTextColor || 'white';

            let buttonText;
            if (config.LdapLoginFieldName) {
                buttonText = (
                    <Text style={[GlobalStyles.signupButtonText, {color: textColor}]}>
                        {config.LdapLoginFieldName}
                    </Text>
                );
            } else {
                buttonText = (
                    <FormattedText
                        id='login.ldapUsernameLower'
                        defaultMessage='AD/LDAP username'
                        style={[GlobalStyles.signupButtonText, {color: textColor}]}
                    />
                );
            }

            return (
                <Button
                    key='ldap'
                    onPress={() => preventDoubleTap(this.goToLogin, this)}
                    containerStyle={[GlobalStyles.signupButton, additionalStyle]}
                >
                    {buttonText}
                </Button>
            );
        }

        return null;
    };

    renderGitlabOption = () => {
        const {config} = this.props;

        const forceHideFromLocal = LocalConfig.HideGitLabLoginExperimental;

        if (!forceHideFromLocal && config.EnableSignUpWithGitLab === 'true') {
            return (
                <Button
                    key='gitlab'
                    onPress={() => preventDoubleTap(this.goToSSO, this, ViewTypes.GITLAB)}
                    containerStyle={[GlobalStyles.signupButton, {backgroundColor: '#548'}]}
                >
                    <Image
                        source={gitlab}
                        style={{height: 18, marginRight: 5, width: 18}}
                    />
                    <Text
                        style={[GlobalStyles.signupButtonText, {color: 'white'}]}
                    >
                        {'GitLab'}
                    </Text>
                </Button>
            );
        }

        return null;
    };

    renderSamlOption = () => {
        const {config, license} = this.props;
        const forceHideFromLocal = LocalConfig.HideSAMLLoginExperimental;

        if (!forceHideFromLocal && config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true') {
            const backgroundColor = config.SamlLoginButtonColor || '#34a28b';

            const additionalStyle = {
                backgroundColor
            };

            if (config.SAMLLoginButtonBorderColor) {
                additionalStyle.borderColor = config.SamlLoginButtonBorderColor;
            }

            const textColor = config.SamlLoginButtonTextColor || 'white';

            return (
                <Button
                    key='saml'
                    onPress={() => preventDoubleTap(this.goToSSO, this, ViewTypes.SAML)}
                    containerStyle={[GlobalStyles.signupButton, additionalStyle]}
                >
                    <Text
                        style={[GlobalStyles.signupButtonText, {color: textColor}]}
                    >
                        {config.SamlLoginButtonText}
                    </Text>
                </Button>
            );
        }

        return null;
    };

    scrollRef = (ref) => {
        this.scroll = ref;
    };

    render() {
        return (
            <ScrollView
                style={style.container}
                contentContainerStyle={style.innerContainer}
                ref={this.scrollRef}
            >
                <StatusBar/>
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
                <FormattedText
                    style={[GlobalStyles.subheader, {fontWeight: 'bold', marginTop: 10}]}
                    id='mobile.login_options.choose_title'
                    defaultMessage='Choose your login method'
                />
                {this.renderEmailOption()}
                {this.renderLdapOption()}
                {this.renderGitlabOption()}
                {this.renderSamlOption()}
            </ScrollView>
        );
    }
}

const style = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        flex: 1
    },
    innerContainer: {
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 50
    }
});

export default injectIntl(LoginOptions);
