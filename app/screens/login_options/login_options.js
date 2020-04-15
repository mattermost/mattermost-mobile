// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Dimensions,
    Image,
    ScrollView,
    Text,
    Appearance,
} from 'react-native';
import Button from 'react-native-button';
import {Navigation} from 'react-native-navigation';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import EphemeralStore from 'app/store/ephemeral_store';
import {GlobalStyles} from 'app/styles';
import {preventDoubleTap} from 'app/utils/tap';
import {ViewTypes} from 'app/constants';
import {goToScreen} from 'app/actions/navigation';
import {getColorStyles, getLogo, getStyledNavigationOptions} from 'app/utils/appearance';

import LocalConfig from 'assets/config';
import gitlab from 'assets/images/gitlab.png';

export default class LoginOptions extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            colorStyles: getColorStyles(Appearance.getColorScheme()),
            error: null,
            logo: getLogo(Appearance.getColorScheme()),
        };
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.orientationDidChange);
        this.appearanceEventListener = Appearance.addChangeListener(({colorScheme}) => {
            const colorStyles = getColorStyles(colorScheme);
            this.setState({
                colorStyles,
                logo: getLogo(colorScheme),
            });

            Navigation.mergeOptions(EphemeralStore.getNavigationTopComponentId(), getStyledNavigationOptions(colorStyles));
        });
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.orientationDidChange);
        this.appearanceEventListener.remove();
    }

    goToLogin = preventDoubleTap(() => {
        const {intl} = this.context;
        const {colorStyles} = this.state;
        const screen = 'Login';
        const title = intl.formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'});
        const options = getStyledNavigationOptions(colorStyles);

        goToScreen(screen, title, {}, options);
    });

    goToSSO = (ssoType) => {
        const {intl} = this.context;
        const {colorStyles} = this.state;
        const screen = 'SSO';
        const title = intl.formatMessage({id: 'mobile.routes.sso', defaultMessage: 'Single Sign-On'});

        goToScreen(screen, title, {ssoType}, getStyledNavigationOptions(colorStyles));
    };

    orientationDidChange = () => {
        this.scroll.scrollTo({x: 0, y: 0, animated: true});
    };

    renderEmailOption = () => {
        const {config} = this.props;
        const {colorStyles} = this.state;
        const forceHideFromLocal = LocalConfig.HideEmailLoginExperimental;

        if (!forceHideFromLocal && (config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true')) {
            return (
                <Button
                    key='email'
                    onPress={this.goToLogin}
                    containerStyle={[GlobalStyles.authButton, colorStyles.authButton]}
                >
                    <FormattedText
                        id='signup.email'
                        defaultMessage='Email and Password'
                        style={[GlobalStyles.authButtonText, colorStyles.authButtonText]}
                    />
                </Button>
            );
        }

        return null;
    };

    renderLdapOption = () => {
        const {config, license} = this.props;
        const {colorStyles} = this.state;
        const forceHideFromLocal = LocalConfig.HideLDAPLoginExperimental;

        if (!forceHideFromLocal && license.IsLicensed === 'true' && config.EnableLdap === 'true') {
            let buttonText;
            if (config.LdapLoginFieldName) {
                buttonText = (
                    <Text style={[GlobalStyles.authButtonText, colorStyles.authButtonText]}>
                        {config.LdapLoginFieldName}
                    </Text>
                );
            } else {
                buttonText = (
                    <FormattedText
                        id='login.ldapUsernameLower'
                        defaultMessage='AD/LDAP username'
                        style={[GlobalStyles.authButtonText, colorStyles.authButtonText]}
                    />
                );
            }

            return (
                <Button
                    key='ldap'
                    onPress={this.goToLogin}
                    containerStyle={[GlobalStyles.authButton, {backgroundColor: '#2389d7'}]}
                >
                    {buttonText}
                </Button>
            );
        }

        return null;
    };

    renderGitlabOption = () => {
        const {config} = this.props;
        const {colorStyles} = this.state;

        const forceHideFromLocal = LocalConfig.HideGitLabLoginExperimental;

        if (!forceHideFromLocal && config.EnableSignUpWithGitLab === 'true') {
            return (
                <Button
                    key='gitlab'
                    onPress={preventDoubleTap(() => this.goToSSO(ViewTypes.GITLAB))}
                    containerStyle={[GlobalStyles.authButton, {backgroundColor: '#548'}]}
                >
                    <Image
                        source={gitlab}
                        style={{height: 18, marginRight: 5, width: 18}}
                    />
                    <Text
                        style={[GlobalStyles.authButtonText, colorStyles.authButtonText]}
                    >
                        {'GitLab'}
                    </Text>
                </Button>
            );
        }

        return null;
    };

    renderO365Option = () => {
        const {config, license} = this.props;
        const {colorStyles} = this.state;
        const forceHideFromLocal = LocalConfig.HideO365LoginExperimental;
        const o365Enabled = config.EnableSignUpWithOffice365 === 'true' && license.IsLicensed === 'true' && license.Office365OAuth === 'true';

        if (!forceHideFromLocal && o365Enabled) {
            return (
                <Button
                    key='o365'
                    onPress={preventDoubleTap(() => this.goToSSO(ViewTypes.OFFICE365))}
                    containerStyle={[GlobalStyles.authButton, {backgroundColor: '#2389d7'}]}
                >
                    <FormattedText
                        id='signup.office365'
                        defaultMessage='Office 365'
                        style={[GlobalStyles.authButtonText, colorStyles.authButtonText]}
                    />
                </Button>
            );
        }

        return null;
    };

    renderSamlOption = () => {
        const {config, license} = this.props;
        const {colorStyles} = this.state;
        const forceHideFromLocal = LocalConfig.HideSAMLLoginExperimental;

        if (!forceHideFromLocal && config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true') {
            return (
                <Button
                    key='saml'
                    onPress={preventDoubleTap(() => this.goToSSO(ViewTypes.SAML))}
                    containerStyle={[GlobalStyles.authButton, {backgroundColor: '#34a28b'}]}
                >
                    <Text
                        style={[GlobalStyles.authButtonText, colorStyles.authButtonText]}
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
        const {colorStyles, logo} = this.state;

        return (
            <ScrollView
                style={[GlobalStyles.container, colorStyles.container]}
                contentContainerStyle={[GlobalStyles.innerContainer, padding(this.props.isLandscape)]}
                ref={this.scrollRef}
            >
                <StatusBar/>
                <Image
                    source={logo}
                />
                <Text style={[GlobalStyles.header, colorStyles.header]}>
                    {this.props.config.SiteName}
                </Text>
                <FormattedText
                    style={[GlobalStyles.subheader, colorStyles.header]}
                    id='web.root.signup_info'
                    defaultMessage='All team communication in one place, searchable and accessible anywhere'
                />
                <FormattedText
                    style={[GlobalStyles.subheader, colorStyles.header, {marginBottom: 24, fontWeight: '500'}]}
                    id='mobile.login_options.choose_title'
                    defaultMessage='Log in to your account with'
                />
                {this.renderEmailOption()}
                {this.renderLdapOption()}
                {this.renderGitlabOption()}
                {this.renderSamlOption()}
                {this.renderO365Option()}
            </ScrollView>
        );
    }
}