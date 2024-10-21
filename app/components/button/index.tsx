// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button as ElementButton} from '@rneui/base';
import React, {useMemo, type ReactNode} from 'react';
import {type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle, type Insets} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity} from '@utils/theme';

type ConditionalProps = | {iconName: string; iconSize: number} | {iconName?: never; iconSize?: never}

type Props = ConditionalProps & {
    theme: Theme;
    backgroundStyle?: StyleProp<ViewStyle>;
    buttonContainerStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    size?: ButtonSize;
    emphasis?: ButtonEmphasis;
    buttonType?: ButtonType;
    buttonState?: ButtonState;
    testID?: string;
    onPress: () => void;
    text: string;
    iconComponent?: ReactNode;
    disabled?: boolean;
    hitSlop?: Insets;
};

const styles = StyleSheet.create({
    container: {flexDirection: 'row'},
    icon: {marginRight: 7},
});

const Button = ({
    theme,
    backgroundStyle,
    buttonContainerStyle,
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
    iconComponent,
    disabled,
    hitSlop,
}: Props) => {
    const bgStyle = useMemo(() => [
        buttonBackgroundStyle(theme, size, emphasis, buttonType, buttonState),
        backgroundStyle,
    ], [theme, backgroundStyle, size, emphasis, buttonType, buttonState]);

    const txtStyle = useMemo(() => [
        buttonTextStyle(theme, size, emphasis, buttonType),
        textStyle,
    ], [theme, textStyle, size, emphasis, buttonType]);

    const textContainerStyle = useMemo(
        () =>
            (iconSize ? [
                styles.container,
                {minHeight: iconSize},
            ] : styles.container),
        [iconSize],
    );

    let buttonStyle = StyleSheet.flatten(bgStyle);
    if (disabled) {
        buttonStyle = {
            ...buttonStyle,
            backgroundColor: changeOpacity(buttonStyle.backgroundColor! as string, 0.4),
        };
    }

    let icon: ReactNode;

    if (iconComponent) {
        icon = iconComponent;
    } else if (iconName) {
        icon = (
            <CompassIcon
                name={iconName!}
                size={iconSize}
                color={StyleSheet.flatten(txtStyle).color}
                style={styles.icon}
            />
        );
    }

    return (
        <ElementButton
            buttonStyle={buttonStyle}
            containerStyle={buttonContainerStyle}
            onPress={onPress}
            testID={testID}
            disabled={disabled}
            hitSlop={hitSlop}
        >
            <View style={textContainerStyle}>
                {icon}
                <Text
                    style={txtStyle}
                    numberOfLines={1}
                >
                    {text}
                </Text>
            </View>
        </ElementButton>
    );
};

export default Button;
