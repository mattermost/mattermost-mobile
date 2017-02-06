// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent, PropTypes} from 'react';
import {
    Image,
    Text,
    View
} from 'react-native';

import Button from 'react-native-button';
import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';

import logo from 'assets/images/logo.png';

export default class LoginOptions extends PureComponent {
    static propTypes = {
        actions: React.PropTypes.shape({
            goToLogin: PropTypes.func.isRequired,
            goToSaml: PropTypes.func.isRequired
        }).isRequired,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired
    };

    renderEmailOption = () => {
        const config = this.props.config;
        if (config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true') {
            return (
                <Button
                    key='email'
                    onPress={this.props.actions.goToLogin}
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

    renderSamlOption = () => {
        const {config, license} = this.props;
        if (config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true') {
            return (
                <Button
                    key='saml'
                    onPress={this.props.actions.goToSaml}
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
                    id='mobile.login_options.chooseTitle'
                    defaultMessage='Choose your login method'
                />
                {this.renderEmailOption()}
                {this.renderSamlOption()}
            </View>
        );
    }
}
