// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';

import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import {CHROME_ICON_BUTTON_DISABLED_ICON_OPACITY, CHROME_ICON_BUTTON_ICON_OPACITY, CHROME_ICON_BUTTON_SIZE} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {changeOpacity} from '@utils/theme';

import GlassSurface from './glass_surface';

type Props = {
    disabled?: boolean;
    iconName: CompassIconName;
    iconSize?: number;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

const hitSlop = {top: 8, bottom: 8, left: 8, right: 8};

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        borderRadius: CHROME_ICON_BUTTON_SIZE / 2,
        height: CHROME_ICON_BUTTON_SIZE,
        justifyContent: 'center',
        width: CHROME_ICON_BUTTON_SIZE,
    },
});

export default function ChromeIconButton({
    disabled = false,
    iconName,
    iconSize = 22,
    onPress,
    style,
    testID,
}: Props) {
    const theme = useTheme();
    const pressableStyle = usePressableOpacityStyle([styles.button, style]);
    const iconColor = changeOpacity(
        theme.sidebarHeaderTextColor,
        disabled ? CHROME_ICON_BUTTON_DISABLED_ICON_OPACITY : CHROME_ICON_BUTTON_ICON_OPACITY,
    );

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
                <CompassIcon
                    color={iconColor}
                    name={iconName}
                    size={iconSize}
                />
            </GlassSurface>
        </Pressable>
    );
}
