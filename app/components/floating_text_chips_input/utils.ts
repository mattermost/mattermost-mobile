// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type NativeSyntheticEvent, Platform, type TargetedEvent, type TextInputFocusEventData, type TextStyle} from 'react-native';

export const onExecution = (
    e: NativeSyntheticEvent<TextInputFocusEventData>,
    innerFunc?: () => void,
    outerFunc?: ((event: NativeSyntheticEvent<TargetedEvent>) => void),
) => {
    innerFunc?.();
    outerFunc?.(e);
};

export const getLabelPositions = (style: TextStyle, labelStyle: TextStyle, smallLabelStyle: TextStyle) => {
    const top = style.paddingTop as number || 0;
    const bottom = style.paddingBottom as number || 0;

    const height = (style.height as number || (top + bottom) || style.padding as number) || 0;
    const textInputFontSize = style.fontSize || 13;
    const labelFontSize = labelStyle.fontSize || 16;
    const smallLabelFontSize = smallLabelStyle.fontSize || 10;
    const fontSizeDiff = textInputFontSize - labelFontSize;
    const unfocused = (height * 0.5) + (fontSizeDiff * (Platform.OS === 'android' ? 0.5 : 0.6));
    const focused = -(labelFontSize + smallLabelFontSize) * 0.25;
    return [unfocused, focused];
};

