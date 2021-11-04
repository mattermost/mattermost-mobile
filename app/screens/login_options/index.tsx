// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {GestureResponderEvent, ScrollView, View} from 'react-native';
import {NavigationFunctionComponent} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {t} from '@i18n';
import Background from '@screens/background';
import Login from '@screens/login';
import MessageLine from '@screens/message_line';
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

const LoginOptions: NavigationFunctionComponent = ({config, launchType, launchError, license, serverDisplayName, serverUrl, theme}: LoginOptionsProps) => {
    const styles = getStyles(theme);
    const [hasLogin, setHasLogin] = useState(false);
    const [hasSSOs, setHasSSOs] = useState(false);

    const messageLine = hasLogin && hasSSOs && (
        <MessageLine
            theme={theme}
        />
    );

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
                        setHasComponents={setHasLogin}
                        show={hasLogin}
                        config={config}
                        key={'login'}
                        license={license}
                        launchError={launchError}
                        launchType={launchType}
                        theme={theme}
                        serverDisplayName={serverDisplayName}
                        serverUrl={serverUrl}
                    />
                    {messageLine}
                    <SsoOptions
                        setHasComponents={setHasSSOs}
                        vertical={!hasLogin}
                        show={hasSSOs}
                        componentId={'sso'}
                        key={'sso'}
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
