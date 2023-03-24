// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import RNButton from 'react-native-button';

import CompassIcon from '@components/compass_icon';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';

type ConditionalProps = | {iconName: string; iconSize: number} | {iconName?: never; iconSize?: never}

type Props = ConditionalProps & {
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

const styles = StyleSheet.create({
    container: {flexDirection: 'row'},
    icon: {marginRight: 7},
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
    iconName,
    iconSize,
}: Props) => {
    const bgStyle = useMemo(() => [
        buttonBackgroundStyle(theme, size, emphasis, buttonType, buttonState),
        backgroundStyle,
    ], [theme, backgroundStyle, size, emphasis, buttonType, buttonState]);

    const txtStyle = useMemo(() => [
        buttonTextStyle(theme, size, emphasis, buttonType),
        textStyle,
    ], [theme, textStyle, size, emphasis, buttonType]);

    const containerStyle = useMemo(
        () =>
            (iconSize ? [
                styles.container,
                {minHeight: iconSize},
            ] : styles.container),
        [iconSize],
    );

    return (
        <RNButton
            containerStyle={bgStyle}
            onPress={onPress}
            testID={testID}
        >
            <View style={containerStyle}>
                {Boolean(iconName) &&
                <CompassIcon
                    name={iconName!}
                    size={iconSize}
                    color={StyleSheet.flatten(txtStyle).color}
                    style={styles.icon}
                />
                }
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
