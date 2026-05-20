// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {AppState, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {reconnectErasedServer} from '@actions/remote/ephemeral_mode/reconnect';
import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import Alert from '@components/illustrations/alert';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {usePreventDoubleTap} from '@hooks/utils';
import Servers from '@screens/home/channel_list/servers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export interface DataErasedProps {
    serverUrl: string;
    displayName: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    alertContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        maxWidth: 600,
        alignSelf: 'center',
    },
    boldText: {
        ...typography('Body', 200, 'SemiBold'),
        lineHeight: 20,
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        zIndex: 10,
        left: 16,
        width: 40,
        height: 40,
    },
    iconWrapper: {
        height: 120,
        width: 120,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 24,
        textAlign: 'center',
        ...typography('Heading', 800),
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        textAlign: 'center',
        marginTop: 12,
        ...typography('Body', 200, 'Regular'),
    },
    buttonContainer: {
        marginTop: 32,
        width: '100%',
    },
    error: {
        color: theme.errorTextColor,
        textAlign: 'center',
        marginTop: 16,
        ...typography('Body', 100, 'Regular'),
    },
}));

const DataErased = ({serverUrl, displayName}: DataErasedProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [hasError, setHasError] = useState(false);

    useDidMount(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                setHasError(false);
            }
        });
        return () => sub.remove();
    });

    const onReconnect = usePreventDoubleTap(useCallback(async () => {
        setIsReconnecting(true);
        setHasError(false);

        const result = await reconnectErasedServer(serverUrl);

        // On success or 401 the screen is replaced via setRoot/relaunch, so we
        // only need to surface state here when the call resolves with a generic error.
        if (result.error) {
            setHasError(true);
            setIsReconnecting(false);
        }
    }, [serverUrl]));

    const iconStyle = useMemo(() => [styles.icon, {top: insets.top + 10}], [insets.top, styles.icon]);
    const iconColor = useMemo(() => changeOpacity(theme.centerChannelColor, 0.56), [theme.centerChannelColor]);

    const buttonTestID = isReconnecting ? 'data_erased.reconnect.button.disabled' : 'data_erased.reconnect.button';

    return (
        <View style={[styles.container, {paddingBottom: insets.bottom}]}>
            <View style={styles.alertContainer}>
                <View style={styles.iconWrapper}>
                    <Alert/>
                </View>
                <FormattedText
                    id='mobile.ephemeralMode.dataErased.title'
                    defaultMessage='Cached data cleared'
                    style={styles.title}
                />
                <FormattedText
                    id='mobile.ephemeralMode.dataErased.body'
                    defaultMessage="Your organization's security policy cleared cached data for the server <b>{displayName}</b> after an extended time offline. Reconnect to restore your data."
                    values={{
                        b: (text: string) => <Text style={styles.boldText}>{text}</Text>,
                        displayName,
                    }}
                    style={styles.description}
                />
                <View style={styles.buttonContainer}>
                    <Button
                        onPress={onReconnect}
                        size='lg'
                        testID={buttonTestID}
                        text={intl.formatMessage({id: 'mobile.ephemeralMode.dataErased.action', defaultMessage: 'Reconnect'})}
                        showLoader={isReconnecting}
                        disabled={isReconnecting}
                        theme={theme}
                    />
                </View>
                {hasError && (
                    <FormattedText
                        id='mobile.ephemeralMode.dataErased.error'
                        defaultMessage="Couldn't reach the server. Check your connection and try again."
                        style={styles.error}
                    />
                )}
            </View>
            <Servers
                iconStyle={iconStyle}
                iconColor={iconColor}
                badgeBorderColor={theme.centerChannelBg}
                testID='data_erased.servers.server_icon'
            />
        </View>
    );
};

export default DataErased;
