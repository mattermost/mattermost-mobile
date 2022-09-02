// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeSyntheticEvent, TargetedEvent, TextInputFocusEventData, TextStyle, ViewStyle} from 'react-native';

import {DEFAULT_INPUT_CONTAINER_HEIGHT, MULTILINE_INPUT_CONTAINER_HEIGHT} from './constants';

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

export const getInputContainerHeight = (
    multiline: Boolean, textInputContainerOverrideStyle: ViewStyle | undefined,
) => {
    let height = multiline ? MULTILINE_INPUT_CONTAINER_HEIGHT : DEFAULT_INPUT_CONTAINER_HEIGHT;

    if (textInputContainerOverrideStyle?.height) {
        height = textInputContainerOverrideStyle.height as number || 0;
    }

    return height;
};
