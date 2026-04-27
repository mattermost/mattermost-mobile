// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {reconnectErasedServer} from '@actions/local/ephemeral_mode/reconnect';
import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import Alert from '@components/illustrations/alert';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

interface Props {
    serverUrl: string;
    displayName: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.centerChannelBg,
        marginHorizontal: 24,
        maxWidth: 600,
        alignSelf: 'center',
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

const DataErased = ({serverUrl, displayName}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const [isReconnecting, setIsReconnecting] = useState(false);
    const [hasError, setHasError] = useState(false);

    const onReconnect = usePreventDoubleTap(useCallback(async () => {
        setIsReconnecting(true);
        setHasError(false);

        const result = await reconnectErasedServer(serverUrl, displayName);

        // On success or 401 the screen is replaced via setRoot/relaunch, so we
        // only need to surface state here when the call resolves with a generic error.
        if (result.error) {
            setHasError(true);
            setIsReconnecting(false);
        }
    }, [serverUrl, displayName]));

    const buttonTestID = isReconnecting ? 'data_erased.reconnect.button.disabled' : 'data_erased.reconnect.button';

    return (
        <View style={styles.container}>
            <View style={styles.iconWrapper}>
                <Alert/>
            </View>
            <FormattedText
                id='mobile.ephemeralMode.dataErased.title'
                defaultMessage='Data has been erased'
                style={styles.title}
            />
            <FormattedText
                id='mobile.ephemeralMode.dataErased.body'
                defaultMessage="Your organization's security policy removed local data for {displayName} after a prolonged offline period. Reconnect to restore your data."
                values={{displayName}}
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
    );
};

export default DataErased;
