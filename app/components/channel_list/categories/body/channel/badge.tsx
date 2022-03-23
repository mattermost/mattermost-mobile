// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    badge: {
        backgroundColor: theme.mentionBg,
        borderRadius: 10,
        height: 20,
        marginTop: 5,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        textAlignVertical: 'center',
    },
    text: {
        color: theme.mentionColor,
        ...typography('Body', 75),
    },
    mutedBadge: {
        backgroundColor: changeOpacity(theme.mentionBg, 0.4),
    },
    mutedText: {
        color: changeOpacity(theme.mentionColor, 0.4),
    },
}));

const Badge = ({count, muted}: {count: number; muted: boolean}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const viewStyle = useMemo(() => [
        styles.badge,
        muted && styles.mutedBadge,
    ], [muted]);

    const textStyle = useMemo(() => [
        styles.text,

        muted && styles.mutedText,
    ], [muted]);

    if (!count) {
        return null;
    }

    return (
        <View style={viewStyle}>
            <Text style={textStyle}>
                {`${count}`}
            </Text>
        </View>
    );
};

export default Badge;
