// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeSyntheticEvent, TargetedEvent, TextInputFocusEventData, TextStyle, ViewStyle} from 'react-native';

export const onExecution = (
    e: NativeSyntheticEvent<TextInputFocusEventData>,
    innerFunc?: () => void,
    outerFunc?: ((event: NativeSyntheticEvent<TargetedEvent>) => void),
) => {
    innerFunc?.();
    outerFunc?.(e);
};

export const getLabelPositions = (textInputContainerStyle: ViewStyle, labelStyle: TextStyle, smallLabelStyle: TextStyle) => {
    const topPadding = textInputContainerStyle.paddingVertical as number || 0;

    const labelFontSize = labelStyle.fontSize || 16;
    const smallLabelFontSize = smallLabelStyle.fontSize || 10;

    const unfocused = (topPadding);
    const focused = -(labelFontSize + smallLabelFontSize) * 0.25;

    return [unfocused, focused];
};

