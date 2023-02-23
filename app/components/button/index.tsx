// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
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
    compassIcon?: React.ReactNode;
}

const styles = StyleSheet.create({
    container: {flexDirection: 'row'},
});

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
    compassIcon,
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
            <View style={styles.container}>
                {compassIcon}
                <Text
                    style={txtStyle}
                    numberOfLines={1}
                >
                    {text}
                </Text>
            </View>
        </RNButton>
    );
};

export default Button;
