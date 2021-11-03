// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Image, View} from 'react-native';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {SSO} from '@constants/screens';
import {LoginOptionsProps} from '@screens/login_options';
import {goToScreen} from '@screens/navigation';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isMinimumServerVersion} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

// LoginOptionWithConfigAndLicenseProps
const SsoOptions = ({config, extra, launchType, launchError, license, theme, serverDisplayName, serverUrl}: LoginOptionsProps) => {
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const displaySSO = preventDoubleTap((ssoType: string) => {
        const screen = SSO;
        const title = intl.formatMessage({id: 'mobile.routes.sso', defaultMessage: 'Single Sign-On'});
        goToScreen(screen, title, {config, extra, launchError, launchType, license, theme, ssoType, serverDisplayName, serverUrl});
    });

    const styleButtonText = buttonTextStyle(theme, 'lg', 'secondary', 'default');
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');
    const isLicensed = license!.IsLicensed === 'true';

    const componentArray = [];

    const getEnabledSSOs = () => {
        const prunedSSOs = [];
        for (const ssoType in Sso.constants) {
            if (ssoType) {
                let forceHideFromLocal = false;
                let enabled = false;
                switch (ssoType) {
                    case Sso.constants.SAML:
                        enabled = config.EnableSaml === 'true' && isLicensed && license!.SAML === 'true';
                        enabled = true;
                        forceHideFromLocal = LocalConfig.HideSAMLLoginExperimental;
                        break;

                    case Sso.constants.GITLAB:
                        enabled = config.EnableSignUpWithGitLab === 'true';
                        enabled = true;
                        forceHideFromLocal = LocalConfig.HideGitLabLoginExperimental;
                        break;

                    case Sso.constants.GOOGLE:
                        enabled = config.EnableSignUpWithGoogle === 'true';

                        enabled = true;
                        break;

                    case Sso.constants.OPENID:
                        enabled = config.EnableSignUpWithOpenId === 'true' && isLicensed && isMinimumServerVersion(config.Version, 5, 33, 0);
                        break;

                    case Sso.constants.OFFICE365:
                        enabled = config.EnableSignUpWithOffice365 === 'true' && isLicensed && license!.Office365OAuth === 'true';

                        // enabled = true;
                        forceHideFromLocal = LocalConfig.HideO365LoginExperimental;
                        break;

                    default:
                }

                // enabled = true;
                if (!forceHideFromLocal && enabled) {
                    prunedSSOs.push(ssoType);
                }
            }
        }

        return prunedSSOs;
    };

    const enabledSSOs = getEnabledSSOs();

    let styleContainer;
    let styleButtonContainer;
    if (enabledSSOs.length === 2) {
        styleContainer = styles.container;
        styleButtonContainer = styles.separatorContainer;
    }

    for (const ssoType of enabledSSOs) {
        const ssoConstants = Sso.values[ssoType];
        const id = ssoConstants.id || '';
        const defaultMessage = ssoConstants.defaultMessage || '';
        const imageSrc = ssoConstants.imageSrc;

        const handlePress = () => {
            displaySSO(ssoType);
        };

        const logoStyle = {
            height: 18,
            marginRight: 5,
            width: 18,
        };

        componentArray.push(
            <View style={styleButtonContainer}>
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
            </View>,
        );
    }

    return (
        <View style={styleContainer}>
            {componentArray}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flexDirection: 'row',
        marginVertical: 24,
        alignItems: 'center',
    },
    separatorContainer: {
        width: '48%',
        marginRight: 8,
    },
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

export default SsoOptions;
