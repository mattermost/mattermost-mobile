// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isMinimumServerVersion} from '@utils/helpers';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const SsoOption = ({ssoType, config, license, onPress, theme}: LoginOptionWithConfigAndLicenseProps) => {
    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'default');
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');
    const styles = getStyleSheet(theme);

    let forceHideFromLocal = false;
    let enabled = false;
    let id = '';
    let defaultMessage;
    const isLicensed = license!.IsLicensed === 'true';
    switch (ssoType) {
        case Sso.SAML:
            enabled = config.EnableSaml === 'true' && isLicensed && license!.SAML === 'true';
            forceHideFromLocal = LocalConfig.HideSAMLLoginExperimental;
            defaultMessage = config.SamlLoginButtonText;
            break;

        case Sso.GITLAB:
            enabled = config.EnableSignUpWithGitLab === 'true';
            forceHideFromLocal = LocalConfig.HideGitLabLoginExperimental;
            defaultMessage = 'GitLab';
            break;

        case Sso.GOOGLE:
            enabled = config.EnableSignUpWithGoogle === 'true';
            id = 'signup.google';
            break;

        case Sso.OPENID:
            enabled = config.EnableSignUpWithOpenId === 'true' && isLicensed && isMinimumServerVersion(config.Version, 5, 33, 0);
            break;

        case Sso.OFFICE365:
            enabled = config.EnableSignUpWithOffice365 === 'true' && isLicensed && license!.Office365OAuth === 'true';
            forceHideFromLocal = LocalConfig.HideO365LoginExperimental;
            break;

        default:
    }

    const handlePress = () => {
        onPress(ssoType);
    };

    if (!forceHideFromLocal && enabled) {
        return (
            <Button
                key={ssoType}
                onPress={handlePress}
                containerStyle={[styleButtonBackground, styles.button]}
            >
                <FormattedText
                    id={ssoType}
                    style={[styleButtonText, styles.buttonText]}
                    defaultMessage={defaultMessage}
                />
            </Button>
        );
    }

    return null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    button: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.64),
    },
    buttonText: {
        textAlign: 'center',
        color: theme.centerChannelColor,
    },
}));

export default SsoOption;
