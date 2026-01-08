// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
            color: theme.sidebarHeaderTextColor,
            ...typography('Heading', 300, 'SemiBold'),
        },
        subtitle: {
            color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
            ...typography('Body', 75),
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
