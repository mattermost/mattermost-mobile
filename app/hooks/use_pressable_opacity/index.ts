// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';

import type {PressableStateCallbackType, StyleProp, ViewStyle} from 'react-native';

export default function usePressableOpacityStyle(style?: StyleProp<ViewStyle>) {
    const pressableStyle = useCallback(({pressed}: PressableStateCallbackType) => [style, pressed && {opacity: 0.72}], [style]);

    return pressableStyle;
}
