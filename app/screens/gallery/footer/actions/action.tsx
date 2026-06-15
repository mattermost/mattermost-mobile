// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {
    Pressable,
    type PressableAndroidRippleConfig,
    type StyleProp,
    StyleSheet,
    type ViewStyle,
} from 'react-native';

import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import usePressableOpacityStyle from '@hooks/use_pressable_opacity';
import {changeOpacity} from '@utils/theme';

type Props = {
    disabled: boolean;
    iconName: CompassIconName;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

const baseStyle = StyleSheet.create({
    container: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const androidRippleConfig: PressableAndroidRippleConfig = {borderless: true, radius: 24, color: '#FFF'};

const Action = ({disabled, iconName, onPress, style}: Props) => {
    const pressableStyle = usePressableOpacityStyle([baseStyle.container, style]);

    return (
        <Pressable
            android_ripple={androidRippleConfig}
            disabled={disabled}
            hitSlop={4}
            onPress={onPress}
            style={pressableStyle}
        >
            <CompassIcon
                color={changeOpacity('#fff', disabled ? 0.4 : 1)}
                name={iconName}
                size={24}
            />
        </Pressable>
    );
};

export default Action;
