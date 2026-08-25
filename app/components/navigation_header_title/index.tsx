// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    title: string;
    subtitle?: string;
    subtitleElement?: React.ReactNode;
    onPress?: () => void;
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
            textAlign: Platform.select({ios: 'center', android: 'flex-start'}),
            width: '100%',
        },
        withSubtitle: {
            ...typography('Heading', 200, 'SemiBold'),
        },
        subtitle: {
            color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
            ...typography('Body', 75),
        },
    };
});

export default function NavigationHeaderTitle({title, subtitle, subtitleElement, onPress}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const subtitleComponent = useMemo(() => {
        if (subtitle && subtitleElement) {
            return (
                <View>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                    {subtitleElement}
                </View>
            );
        } else if (subtitle) {
            return <Text style={styles.subtitle}>{subtitle}</Text>;
        }

        return null;
    }, [styles.subtitle, subtitle, subtitleElement]);

    const pressableStyle = usePressableOpacityStyle(styles.container);

    return (
        <Pressable
            style={pressableStyle}
            disabled={!onPress}
            onPress={onPress}
        >
            <Text style={[styles.title, Boolean(subtitle || subtitleElement) ? styles.withSubtitle : undefined]}>{title}</Text>
            {subtitleComponent}
        </Pressable>
    );
}
