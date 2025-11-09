// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Image} from 'react-native';

import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    goToSso: (ssoType: string) => void;
    ssoOptions: SsoWithOptions;
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 32,
    },
    contentWrapper: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
        paddingHorizontal: 20,
    },
    title: {
        ...typography('Heading', 1000, 'SemiBold'),
        color: theme.centerChannelColor,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.7),
        marginBottom: 36,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
    },
    iconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.buttonColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        shadowColor: changeOpacity(theme.centerChannelColor, 0.12),
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    icon: {
        width: 16,
        height: 16,
        resizeMode: 'contain',
    },
}));

const DaakiaOpenIdLogin = ({goToSso, ssoOptions, theme}: Props) => {
    const styles = getStyles(theme);
    const {formatMessage} = useIntl();

    // Check if OpenID is enabled
    const openIdOption = ssoOptions[Sso.OPENID];
    const isOpenIdEnabled = openIdOption?.enabled;

    // Don't render if OpenID is not enabled
    if (!isOpenIdEnabled) {
        return null;
    }

    // Get OpenID button text
    const openIdText = openIdOption?.text || formatMessage({
        id: 'mobile.login_options.openid',
        defaultMessage: 'Open ID',
    });

    const handleOpenIdPress = () => {
        goToSso(Sso.OPENID);
    };

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                <FormattedText
                    style={styles.title}
                    defaultMessage='Login in your Account'
                    id='daakia.login.title'
                    testID='daakia.openid_login.title'
                />
                <FormattedText
                    style={styles.subtitle}
                    defaultMessage='Continue with your account to access all features'
                    id='daakia.login.subtitle'
                    testID='daakia.openid_login.subtitle'
                />
                <View style={styles.buttonContainer}>
                    <Button
                        onPress={handleOpenIdPress}
                        size='lg'
                        theme={theme}
                        emphasis='primary'
                        iconComponent={
                            <View style={styles.iconWrapper}>
                                <Image
                                    source={require('../../../../assets/base/images/daakiaDlogoCircle.png')}
                                    style={styles.icon}
                                    resizeMode='contain'
                                />
                            </View>
                        }
                        text={openIdText}
                    />
                </View>
            </View>
        </View>
    );
};

export default DaakiaOpenIdLogin;

