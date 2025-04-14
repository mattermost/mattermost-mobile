// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import LoadingErrorSvg from '@components/illustrations/loading_error';
import Loading from '@components/loading';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
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
}));

const LoadingError = ({loading, message, onRetry, title}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const buttonStyle = useMemo(() => {
        return [{marginTop: 24}, buttonBackgroundStyle(theme, 'lg', 'primary', 'inverted')];
    }, [theme]);

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
            <TouchableWithFeedback
                style={buttonStyle}
                onPress={onRetry}
                type={'opacity'}
            >
                <Text style={buttonTextStyle(theme, 'lg', 'primary', 'inverted')}>{'Retry'}</Text>
            </TouchableWithFeedback>
        </View>
    );
};

export default LoadingError;
