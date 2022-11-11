// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleProp, Text, TextStyle, ViewStyle} from 'react-native';

import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';

import TouchableWithFeedback from '../touchable_with_feedback';

type Props = {
    theme: Theme;
    backgroundStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    size?: ButtonSize;
    emphasis?: ButtonEmphasis;
    buttonType?: ButtonType;
    buttonState?: ButtonState;
    onPress: () => void;
    text: string;
}

const Button = ({
    theme,
    backgroundStyle,
    textStyle,
    size,
    emphasis,
    buttonType,
    buttonState,
    onPress,
    text,
}: Props) => {
    const bgStyle = useMemo(() => [
        buttonBackgroundStyle(theme, size, emphasis, buttonType, buttonState),
        backgroundStyle,
    ], [theme, backgroundStyle, size, emphasis, buttonType, buttonState]);

    const txtStyle = useMemo(() => [
        buttonTextStyle(theme, size, emphasis, buttonType),
        textStyle,
    ], [theme, textStyle, size, emphasis, buttonType]);

    return (
        <TouchableWithFeedback
            style={bgStyle}
            onPress={onPress}
            type={'opacity'}
        >
            <Text
                style={txtStyle}
                numberOfLines={1}
            >
                {text}
            </Text>
        </TouchableWithFeedback>
    );
};

export default Button;
