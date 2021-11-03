// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image} from 'react-native';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {t} from '@i18n';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isMinimumServerVersion} from '@utils/helpers';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const SsoOption = ({ssoType, config, license, onPress, theme}: LoginOptionWithConfigAndLicenseProps) => {
    const styleButtonText = buttonTextStyle(theme, 'lg', 'secondary', 'default');
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');
    const styles = getStyleSheet(theme);

    let forceHideFromLocal = false;
    let enabled = false;
    let id = '';
    let imageSrc;
    let defaultMessage;
    const isLicensed = license!.IsLicensed === 'true';
    switch (ssoType) {
        case Sso.SAML:
            enabled = config.EnableSaml === 'true' && isLicensed && license!.SAML === 'true';
            enabled = true;
            forceHideFromLocal = LocalConfig.HideSAMLLoginExperimental;
            defaultMessage = config.SamlLoginButtonText;
            id = t('mobile.login_options.saml');
            break;

        case Sso.GITLAB:
            imageSrc = require('@assets/images/gitlab.png');
            enabled = config.EnableSignUpWithGitLab === 'true';
            enabled = true;
            forceHideFromLocal = LocalConfig.HideGitLabLoginExperimental;
            defaultMessage = 'GitLab';
            id = t('mobile.login_options.gitlab');
            break;

        case Sso.GOOGLE:
            enabled = config.EnableSignUpWithGoogle === 'true';

            // enabled = true;
            imageSrc = require('@assets/images/google.png');
            defaultMessage = 'Google';
            id = t('mobile.login_options.google');
            break;

        case Sso.OPENID:
            enabled = config.EnableSignUpWithOpenId === 'true' && isLicensed && isMinimumServerVersion(config.Version, 5, 33, 0);

            // enabled = true;
            defaultMessage = 'Open ID';
            id = t('mobile.login_options.openid');
            break;

        case Sso.OFFICE365:
            defaultMessage = 'Office 365';
            enabled = config.EnableSignUpWithOffice365 === 'true' && isLicensed && license!.Office365OAuth === 'true';

            // enabled = true;
            forceHideFromLocal = LocalConfig.HideO365LoginExperimental;
            id = t('mobile.login_options.offic365');
            break;

        default:
    }

    const logoStyle = {
        height: 18,
        marginRight: 5,
        backgroundColor: 'black',
        width: 18,
    };

    const handlePress = () => {
        onPress(ssoType);
    };

    if (!forceHideFromLocal && enabled) {
        console.log('<><><> ssoType NOT null', ssoType);
        return (
            <Button
                key={ssoType}
                onPress={handlePress}
                containerStyle={[styleButtonBackground, styles.button]}
            >

                {imageSrc && (
                    <Image
                        source={imageSrc}
                        style={logoStyle}
                    />
                )}
                <FormattedText
                    id={id}
                    style={[styleButtonText, styles.buttonText]}
                    defaultMessage={defaultMessage}
                    testID={id}
                />
            </Button>
        );
    }
    console.log('<><><> ssoType null', ssoType);

    return null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    button: {
        marginVertical: 4,
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
