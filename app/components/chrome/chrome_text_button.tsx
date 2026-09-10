// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, StyleSheet, Text, type StyleProp, type ViewStyle} from 'react-native';

import {CHROME_ICON_BUTTON_SIZE} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import GlassSurface from './glass_surface';

type Props = {
    disabled?: boolean;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    text: string;
}

const hitSlop = {top: 8, bottom: 8, left: 8, right: 8};

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        borderRadius: CHROME_ICON_BUTTON_SIZE / 2,
        height: CHROME_ICON_BUTTON_SIZE,
        justifyContent: 'center',
        minWidth: CHROME_ICON_BUTTON_SIZE,
        paddingHorizontal: 16,
    },
    text: {
        ...typography('Body', 200),
    },
});

export default function ChromeTextButton({
    disabled = false,
    onPress,
    style,
    testID,
    text,
}: Props) {
    const theme = useTheme();
    const pressableStyle = usePressableOpacityStyle([styles.button, style]);
    const textColor = disabled ? changeOpacity(theme.sidebarHeaderTextColor, 0.32) : theme.sidebarHeaderTextColor;

    return (
        <Pressable
            disabled={disabled}
            hitSlop={hitSlop}
            onPress={onPress}
            style={pressableStyle}
            testID={testID}
        >
            <GlassSurface
                backdropColor={theme.sidebarBg}
                interactive={!disabled}
                style={styles.button}
            >
                <Text style={[styles.text, {color: textColor}]}>
                    {text}
                </Text>
            </GlassSurface>
        </Pressable>
    );
}
