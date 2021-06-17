// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import {SSO} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

const SamlOption = ({config, license, onPress, theme}: LoginOptionWithConfigAndLicenseProps) => {
    const styles = getStyleSheet(theme);
    const forceHideFromLocal = LocalConfig.HideSAMLLoginExperimental;
    const enabled = config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true';

    const handlePress = () => {
        onPress(SSO.SAML);
    };

    if (!forceHideFromLocal && enabled) {
        const backgroundColor = config.SamlLoginButtonColor || '#34a28b';

        const additionalStyle = {
            backgroundColor,
            borderColor: 'transparent',
            borderWidth: 0,
        };

        if (config.SamlLoginButtonBorderColor) {
            additionalStyle.borderColor = config.SamlLoginButtonBorderColor;
        }

        const textColor = config.SamlLoginButtonTextColor || 'white';

        return (
            <Button
                key='saml'
                onPress={handlePress}
                containerStyle={[styles.button, additionalStyle]}
            >
                <Text
                    style={[styles.buttonText, {color: textColor}]}
                >
                    {config.SamlLoginButtonText}
                </Text>
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

export default SamlOption;
