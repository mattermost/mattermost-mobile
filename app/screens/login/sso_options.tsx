// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Image, type ImageSourcePropType, Text, View} from 'react-native';
import Button from 'react-native-button';

import CompassIcon from '@components/compass_icon';
import {Sso} from '@constants';
import {buttonBackgroundStyle} from '@utils/buttonStyles';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

type SsoInfo = {
    text: string;
    imageSrc?: ImageSourcePropType;
    compassIcon?: string;
};

type Props = {
    goToSso: (ssoType: string) => void;
    ssoOnly: boolean;
    ssoOptions: SsoWithOptions;
    theme: Theme;
}

const SsoOptions = ({goToSso, ssoOnly, ssoOptions, theme}: Props) => {
    const {formatMessage} = useIntl();
    const styles = getStyleSheet(theme);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');

    const getSsoButtonOptions = ((ssoType: string): SsoInfo => {
        const sso: SsoInfo = {} as SsoInfo;
        const options = ssoOptions[ssoType];
        switch (ssoType) {
            case Sso.SAML:
                sso.text = options.text || formatMessage({id: 'mobile.login_options.saml', defaultMessage: 'SAML'});
                sso.compassIcon = 'lock';
                break;
            case Sso.GITLAB:
                sso.text = formatMessage({id: 'mobile.login_options.gitlab', defaultMessage: 'GitLab'});
                sso.imageSrc = require('@assets/images/Icon_Gitlab.png');
                break;
            case Sso.GOOGLE:
                sso.text = formatMessage({id: 'mobile.login_options.google', defaultMessage: 'Google'});
                sso.imageSrc = require('@assets/images/Icon_Google.png');
                break;
            case Sso.OFFICE365:
                sso.text = formatMessage({id: 'mobile.login_options.office365', defaultMessage: 'Office 365'});
                sso.imageSrc = require('@assets/images/Icon_Office.png');
                break;
            case Sso.OPENID:
                sso.text = options.text || formatMessage({id: 'mobile.login_options.openid', defaultMessage: 'Open ID'});
                sso.imageSrc = require('@assets/images/Icon_Openid.png');
                break;

            default:
        }
        return sso;
    });

    const enabledSSOs = Object.keys(ssoOptions).filter(
        (ssoType: string) => ssoOptions[ssoType].enabled,
    );

    let styleViewContainer;
    let styleButtonContainer;
    if (enabledSSOs.length === 2 && !ssoOnly) {
        styleViewContainer = styles.containerAsRow;
        styleButtonContainer = styles.buttonContainer;
    }

    const componentArray = [];
    for (const ssoType of enabledSSOs) {
        const {compassIcon, text, imageSrc} = getSsoButtonOptions(ssoType);
        const handlePress = () => {
            goToSso(ssoType);
        };

        componentArray.push(
            <Button
                key={ssoType}
                onPress={handlePress}
                containerStyle={[styleButtonBackground, styleButtonContainer, styles.button]}
            >
                {imageSrc && (
                    <Image
                        key={'image' + ssoType}
                        source={imageSrc}
                        style={styles.logoStyle}
                    />
                )}
                {compassIcon &&
                <CompassIcon
                    name={compassIcon}
                    size={16}
                    color={theme.centerChannelColor}
                />
                }
                <View
                    style={styles.buttonTextContainer}
                >
                    <Text
                        key={ssoType}
                        style={styles.buttonText}
                        testID={text}
                    >
                        {text}
                    </Text>
                </View>
            </Button>,
        );
    }

    return (
        <View style={[styleViewContainer, styles.container]}>
            {componentArray}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 24,
    },
    containerAsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonContainer: {
        width: '48%',
        marginRight: 8,
    },
    button: {
        marginVertical: 4,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    buttonTextContainer: {
        color: theme.centerChannelColor,
        flexDirection: 'row',
        marginLeft: 9,
    },
    buttonText: {
        color: theme.centerChannelColor,
        fontFamily: 'OpenSans-SemiBold',
        fontSize: 16,
        lineHeight: 18,
        top: 2,
    },
    logoStyle: {
        height: 18,
        marginRight: 5,
        width: 18,
    },
}));

export default SsoOptions;
