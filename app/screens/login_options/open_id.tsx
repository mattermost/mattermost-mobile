// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Button from 'react-native-button';

import FormattedText from '@components/formatted_text';
import {SSO} from '@constants';
import {isMinimumServerVersion} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';

const OpenIdOption = ({config, license, onPress, theme}: LoginOptionWithConfigAndLicenseProps) => {
    const styles = getStyleSheet(theme);
    const openIdEnabled = config.EnableSignUpWithOpenId === 'true' && license.IsLicensed === 'true' && isMinimumServerVersion(config.Version, 5, 33, 0);

    const handlePress = () => {
        onPress(SSO.OPENID);
    };

    if (openIdEnabled) {
        const additionalButtonStyle = {
            backgroundColor: config.OpenIdButtonColor || '#145DBF',
            borderColor: 'transparent',
            borderWidth: 0,
        };

        const textColor = 'white';

        return (
            <Button
                key='openId'
                onPress={handlePress}
                containerStyle={[styles.button, additionalButtonStyle]}
            >
                <FormattedText
                    id='signup.openid'
                    defaultMessage={config.OpenIdButtonText || 'OpenID'}
                    style={[styles.buttonText, {color: textColor}]}
                />
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

export default OpenIdOption;
