// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import Button from '@components/button';
import LoadingErrorSvg from '@components/illustrations/loading_error';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    loading: boolean;
    message: string;
    onRetry: () => void;
    title: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        color: theme.sidebarHeaderTextColor,
        marginTop: 20,
        textAlign: 'center',
    },
    body: {
        color: theme.sidebarText,
        textAlign: 'center',
        marginTop: 4,
    },
    buttonContainer: {
        marginTop: 24,
    },
}));

const LoadingError = ({loading, message, onRetry, title}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    if (loading) {
        return (
            <Loading
                containerStyle={styles.container}
                color={theme.buttonBg}
            />
        );
    }

    return (
        <View style={styles.container}>
            <LoadingErrorSvg/>
            <Text style={[typography('Heading', 400), styles.header]}>
                {title}
            </Text>
            <Text style={[typography('Body', 200), styles.body]}>
                {message}
            </Text>
            <View style={styles.buttonContainer}>
                <Button
                    text={intl.formatMessage({id: 'loading_error.retry', defaultMessage: 'Retry'})}
                    onPress={onRetry}
                    size='lg'
                    theme={theme}
                />
            </View>
        </View>
    );
};

export default LoadingError;
