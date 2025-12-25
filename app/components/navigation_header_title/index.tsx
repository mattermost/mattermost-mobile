// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    title: string;
    subtitle?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            justifyContent: 'center',
            alignItems: Platform.select({ios: 'center', android: 'flex-start'}),
            flexDirection: 'column',
        },
        title: {
            color: theme.centerChannelColor,
            fontFamily: 'Metropolis-SemiBold',
            fontSize: 18,
            fontWeight: '600',
        },
        subtitle: {
            color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
            fontFamily: 'OpenSans',
            fontSize: 12,
            fontWeight: '400',
        },
    };
});

export default function NavigationHeaderTitle({title, subtitle}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {Boolean(subtitle) && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
    );
}
