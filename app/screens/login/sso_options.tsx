// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, type ImageSource} from 'expo-image';
import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View} from 'react-native';

import Button from '@components/button';
import {Sso} from '@constants';

type SsoInfo = {
    text: string;
    imageSrc?: ImageSource;
    compassIcon?: string;
};

type Props = {
    goToSso: (ssoType: string) => void;
    intuneAuthService?: string;
    isIntuneEnabled?: boolean;
    ssoOnly: boolean;
    ssoOptions: SsoWithOptions;
    theme: Theme;
}

const SsoOptions = ({goToSso, intuneAuthService, isIntuneEnabled, ssoOnly, ssoOptions, theme}: Props) => {
    const {formatMessage} = useIntl();

    const getSsoButtonOptions = ((ssoType: string): SsoInfo => {
        const sso: SsoInfo = {} as SsoInfo;
        const options = ssoOptions[ssoType];
        switch (ssoType) {
            case Sso.SAML:
                sso.text = options.text || formatMessage({id: 'mobile.login_options.saml', defaultMessage: 'SAML'});
                if (isIntuneEnabled && intuneAuthService?.toLocaleLowerCase() === ssoType.toLocaleLowerCase()) {
                    sso.imageSrc = require('@assets/images/Icon_EntraID.png');
                } else {
                    sso.compassIcon = 'lock';
                }
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
                sso.text = formatMessage({id: 'mobile.login_options.entraid', defaultMessage: 'Entra ID'});
                sso.imageSrc = require('@assets/images/Icon_EntraID.png');
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
        (ssoType: string) => {
            if (isIntuneEnabled) {
                if (ssoType === Sso.OFFICE365 && intuneAuthService?.toLocaleLowerCase() === Sso.SAML.toLocaleLowerCase()) {
                    return false;
                }

            }
            return ssoOptions[ssoType].enabled;
        },
    );

    const styleViewContainer = enabledSSOs.length === 2 && !ssoOnly ? styles.containerAsRow : undefined;
    const styleButtonWrapper = enabledSSOs.length === 2 && !ssoOnly ? styles.buttonWrapper : undefined;

    const componentArray = [];
    for (const ssoType of enabledSSOs) {
        const {compassIcon, text, imageSrc} = getSsoButtonOptions(ssoType);
        const handlePress = () => {
            goToSso(ssoType);
        };

        componentArray.push(
            <View
                style={styleButtonWrapper}
                key={ssoType}
            >
                <Button
                    key={ssoType}
                    onPress={handlePress}
                    size='lg'
                    theme={theme}
                    iconName={compassIcon}
                    emphasis='secondary'
                    iconComponent={imageSrc ? (
                        <Image
                            key={'image' + ssoType}
                            source={imageSrc}
                            style={styles.logoStyle}
                            cachePolicy='memory'
                        />
                    ) : undefined}
                    text={text}
                />
            </View>,
        );
    }

    return (
        <View style={[styleViewContainer, styles.container]}>
            {componentArray}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 24,
        gap: 8,
    },
    containerAsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonWrapper: {
        flex: 1,
    },
    logoStyle: {
        height: 18,
        marginRight: 5,
        width: 18,
    },
});

export default SsoOptions;
