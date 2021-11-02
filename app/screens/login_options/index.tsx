// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {GestureResponderEvent, ScrollView, View} from 'react-native';
import {NavigationFunctionComponent} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {LOGIN, SSO} from '@constants/screens';
import {t} from '@i18n';
import Background from '@screens/background';
import Login from '@screens/login';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SsoOptions from './sso_options';

import type {LaunchProps} from '@typings/launch';

export interface LoginOptionsProps extends LaunchProps {
    onPress?: (type: string|GestureResponderEvent) => void | (() => void);
    componentId: string;
    serverUrl: string;
    serverDisplayName: string;
    config: ClientConfig;
    license: ClientLicense;
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        color: theme.mentionColor,
        marginBottom: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    subheader: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 12,
        ...typography('Body', 200, 'Regular'),
    },
    innerContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 15,
        flex: 1,
    },
}));

const LoginOptions: NavigationFunctionComponent = ({config, extra, launchType, launchError, license, serverDisplayName, serverUrl, theme}: LoginOptionsProps) => {
    const intl = useIntl();
    const styles = getStyles(theme);

    const displayLogin = preventDoubleTap(() => {
        const screen = LOGIN;
        const title = intl.formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'});

        goToScreen(screen, title, {config, extra, launchError, launchType, license, serverDisplayName, serverUrl, theme});
    });

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <SafeAreaView style={styles.container}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.innerContainer}
                >
                    <FormattedText
                        defaultMessage='Log In to Your Account'
                        id={t('mobile.login_options.heading')}
                        testID={t('mobile.login_options.heading')}
                        style={styles.header}
                    />
                    <FormattedText
                        style={styles.subheader}
                        id={t('mobile.login_options.description')}
                        testID={t('mobile.login_options.description')}
                        defaultMessage='Enter your login details below.'
                    />
                    <Login
                        config={config}
                        license={license}
                        launchError={launchError}
                        launchType={launchType}
                        theme={theme}
                        serverDisplayName={serverDisplayName}
                    />

                    {/* <LdapOption */}
                    {/*     config={config} */}
                    {/*     license={license} */}
                    {/*     onPress={displayLogin} */}
                    {/*     theme={theme} */}
                    {/* /> */}

                    <SsoOptions
                        launchType={launchType}
                        launchError={launchError}
                        config={config}
                        license={license}
                        serverDisplayName={serverDisplayName}
                        serverUrl={serverUrl}
                        theme={theme}
                    />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default LoginOptions;
