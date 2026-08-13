// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {Pressable, Text} from 'react-native';

import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import {useTheme} from '@context/theme';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type NavigationButtonProps = {
    borderless?: boolean;
    color?: string;
    disabled?: boolean;
    iconName?: CompassIconName;
    iconSize?: number;
    text?: string;
    count?: number | string;
    onPress: () => void;
    rippleRadius?: number;
    testID?: string;
}

const hitSlop = {top: 20, bottom: 5, left: 5, right: 5};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {flexDirection: 'row', alignItems: 'center'},
    enabled: {color: theme.sidebarHeaderTextColor},
    disabled: {color: theme.sidebarHeaderTextColor, opacity: 0.32},
    icon: {padding: 5},
    title: typography('Body', 200),
    count: typography('Body', 200),
}));

function NavigationButton({
    borderless = true,
    color,
    count,
    disabled,
    iconName,
    iconSize = 20,
    onPress,
    rippleRadius = 20,
    testID,
    text,
}: NavigationButtonProps) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const colorStyle = useMemo(() => ({color: disabled ? changeOpacity(color ?? theme.sidebarHeaderTextColor, 0.32) : (color ?? theme.sidebarHeaderTextColor)}), [color, disabled, theme.sidebarHeaderTextColor]);
    const ripple = useMemo(() => ({borderless, radius: rippleRadius}), [borderless, rippleRadius]);
    const pressableStyle = usePressableOpacityStyle(styles.container);

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            hitSlop={hitSlop}
            testID={testID}
            android_ripple={ripple}
            style={pressableStyle}
        >

            {Boolean(text) && <Text style={[styles.title, colorStyle]}>{text}</Text>}
            {Boolean(iconName) &&
                <CompassIcon
                    name={iconName!}
                    size={iconSize}
                    style={[styles.icon, colorStyle]}
                />
            }
            {Boolean(count) && <Text style={[styles.count, colorStyle]}>{count}</Text>}
        </Pressable>
    );
}

export default NavigationButton;
