// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleProp, Text, TextStyle, ViewStyle} from 'react-native';
import RNButton from 'react-native-button';

import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';

type Props = {
    theme: Theme;
    backgroundStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    size?: ButtonSize;
    emphasis?: ButtonEmphasis;
    buttonType?: ButtonType;
    buttonState?: ButtonState;
    testID?: string;
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
    testID,
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
        <RNButton
            containerStyle={bgStyle}
            onPress={onPress}
            testID={testID}
        >
            <Text
                style={txtStyle}
                numberOfLines={1}
            >
                {text}
            </Text>
        </RNButton>
    );
};

export default Button;
