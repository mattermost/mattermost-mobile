// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Image,
    StatusBar,
    Text,
    View
} from 'react-native';
import Button from 'react-native-button';
import semver from 'semver';

import {ViewTypes} from 'app/constants';
import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';
import {preventDoubleTap} from 'app/utils/tap';

import gitlab from 'assets/images/gitlab.png';
import logo from 'assets/images/logo.png';

class LoginOptions extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        serverVersion: PropTypes.string.isRequired,
        theme: PropTypes.object
    };

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

    renderEmailOption = () => {
        const {config} = this.props;
        if (config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true') {
            return (
                <Button
                    key='email'
                    onPress={() => preventDoubleTap(this.goToLogin, this)}
                    containerStyle={[GlobalStyles.signupButton, {backgroundColor: '#2389d7'}]}
                >
                    <FormattedText
                        id='signup.email'
                        defaultMessage='Email and Password'
                        style={[GlobalStyles.signupButtonText, {color: 'white'}]}
                    />
                </Button>
            );
        }

        return null;
    };

    renderGitlabOption = () => {
        const {config, serverVersion} = this.props;
        const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
        if (config.EnableSignUpWithGitLab === 'true' && semver.valid(version) && semver.gte(version, 'v3.10.0')) {
            return (
                <Button
                    key='saml'
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
        if (config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true') {
            return (
                <Button
                    key='saml'
                    onPress={() => preventDoubleTap(this.goToSSO, this, ViewTypes.SAML)}
                    containerStyle={[GlobalStyles.signupButton, {backgroundColor: '#34a28b'}]}
                >
                    <Text
                        style={[GlobalStyles.signupButtonText, {color: 'white'}]}
                    >
                        {config.SamlLoginButtonText}
                    </Text>
                </Button>
            );
        }

        return null;
    };

    render() {
        return (
            <View style={[GlobalStyles.container, GlobalStyles.signupContainer]}>
                <StatusBar barStyle='light-content'/>
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
                {this.renderGitlabOption()}
                {this.renderSamlOption()}
            </View>
        );
    }
}

export default injectIntl(LoginOptions);
