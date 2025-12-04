// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {type StyleProp, StyleSheet, type TextStyle, View, type ViewStyle} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type Props = {
    badgeBackgroundColor?: string;
    badgeBorderColor?: string;
    badgeColor?: string;
    badgeStyle?: StyleProp<TextStyle>;
    hasUnreads: boolean;
    iconColor?: string;
    mentionCount: number;
    onPress?: () => void;
    size?: number;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    unreadStyle?: StyleProp<TextStyle>;
}

const hitSlop = {top: 20, bottom: 5, left: 40, right: 20};

const styles = StyleSheet.create({
    badge: {
        left: 13,
        top: -8,
    },
    unread: {
        left: 18,
        top: -5,
    },
});

export default function ServerIcon({
    badgeBackgroundColor,
    badgeBorderColor,
    badgeColor,
    badgeStyle,
    hasUnreads,
    iconColor,
    mentionCount,
    onPress,
    size = 24,
    style,
    testID,
    unreadStyle,
}: Props) {
    const theme = useTheme();
    const hasBadge = Boolean(mentionCount || hasUnreads);
    const count = mentionCount || (hasUnreads ? -1 : 0);
    const memoizedStyle = useMemo(() => {
        return [(badgeStyle || styles.badge), count > -1 ? undefined : (unreadStyle || styles.unread)];
    }, [badgeStyle, count, unreadStyle]);

    return (
        <View style={style}>
            <TouchableWithFeedback
                disabled={onPress === undefined}
                onPress={onPress}
                type='opacity'
                testID={testID}
                hitSlop={hitSlop}
            >
                <CompassIcon
                    size={size}
                    name='server-variant'
                    color={iconColor || changeOpacity(theme.sidebarHeaderTextColor, 0.56)}
                />
                <Badge
                    borderColor={badgeBorderColor || theme.sidebarTeamBarBg}
                    backgroundColor={badgeBackgroundColor}
                    color={badgeColor}
                    visible={hasBadge}
                    style={memoizedStyle}
                    testID={`${testID}.badge`}
                    value={count}
                />
            </TouchableWithFeedback>
        </View>
    );
}

