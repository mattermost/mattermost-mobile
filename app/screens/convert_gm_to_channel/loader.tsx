// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        loadingContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            gap: 24,
        },
        text: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 300, 'SemiBold'),
        },
    };
});

export const Loader = () => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator
                size={'large'}
                color={theme.buttonBg}
            />
            <Text style={styles.text}>{'Fetching details...'}</Text>
        </View>
    );
};
