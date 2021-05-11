// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme} from '@utils/theme';

const LdapOption = ({config, license, onPress, theme}: LoginOptionWithConfigAndLicenseProps) => {
    const styles = getStyleSheet(theme);
    const forceHideFromLocal = LocalConfig.HideLDAPLoginExperimental;

    if (!forceHideFromLocal && license.IsLicensed === 'true' && config.EnableLdap === 'true') {
        const backgroundColor = config.LdapLoginButtonColor || '#2389d7';
        const additionalButtonStyle = {
            backgroundColor,
            borderColor: 'transparent',
            borderWidth: 1,
        };

        if (config.LdapLoginButtonBorderColor) {
            additionalButtonStyle.borderColor = config.LdapLoginButtonBorderColor;
        }

        const textColor = config.LdapLoginButtonTextColor || 'white';

        let buttonText;
        if (config.LdapLoginFieldName) {
            buttonText = (
                <Text style={[styles.buttonText, {color: textColor}]}>
                    {config.LdapLoginFieldName}
                </Text>
            );
        } else {
            buttonText = (
                <FormattedText
                    id='login.ldapUsernameLower'
                    defaultMessage='AD/LDAP username'
                    style={[styles.buttonText, {color: textColor}]}
                />
            );
        }

        return (
            <Button
                key='ldap'
                onPress={onPress}
                containerStyle={[styles.button, additionalButtonStyle]}
            >
                {buttonText}
            </Button>
        );
    }

    return null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    button: {
        borderRadius: 3,
        borderColor: theme.buttonBg,
        alignItems: 'center',
        borderWidth: 1,
        alignSelf: 'stretch',
        marginTop: 10,
        padding: 15,
    },
    buttonText: {
        textAlign: 'center',
        color: theme.buttonBg,
        fontSize: 17,
    },
}));

export default LdapOption;
