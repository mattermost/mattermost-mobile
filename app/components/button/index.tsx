// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button as ElementButton, type ButtonProps} from '@rneui/base';
import React, {useMemo, type ReactNode} from 'react';
import {type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle, type Insets} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';

type Props = Omit<ButtonProps, 'size'> & {
    theme: Theme;
    backgroundStyle?: StyleProp<ViewStyle>;
    buttonContainerStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    size?: ButtonSize;
    emphasis?: ButtonEmphasis;
    testID?: string;
    onPress?: () => void;
    text: string;
    iconComponent?: ReactNode;
    disabled?: boolean;
    hitSlop?: Insets;
    isIconOnTheRight?: boolean;
    iconName?: string;
    showLoader?: boolean;
    isInverted?: boolean;
    isDestructive?: boolean;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
    },
});

const iconSizePerSize: Record<ButtonSize, number> = {
    xs: 14,
    s: 14,
    m: 18,
    lg: 22,
};

const Button = ({
    theme,
    backgroundStyle,
    buttonContainerStyle,
    textStyle,
    size = 'm',
    emphasis,
    onPress,
    text,
    testID,
    iconName,
    isIconOnTheRight = false,
    iconComponent,
    disabled,
    hitSlop,
    showLoader = false,
    isInverted = false,
    isDestructive = false,
}: Props) => {
    let buttonType: ButtonType = 'default';
    if (isDestructive) {
        buttonType = 'destructive';
    } else if (isInverted) {
        buttonType = 'inverted';
    }

    const bgStyle = useMemo(() => [
        buttonBackgroundStyle(theme, size, emphasis, buttonType),
        backgroundStyle,
    ], [theme, backgroundStyle, size, emphasis, buttonType]);

    const bgDisabledStyle = useMemo(() => [
        buttonBackgroundStyle(theme, size, emphasis, 'disabled'),
        backgroundStyle,
    ], [theme, backgroundStyle, size, emphasis]);

    const txtStyle = useMemo(() => StyleSheet.flatten([
        buttonTextStyle(theme, size, emphasis, buttonType),
        textStyle,
    ]), [theme, textStyle, size, emphasis, buttonType]);

    const txtDisabledStyle = useMemo(() => StyleSheet.flatten([
        buttonTextStyle(theme, size, emphasis, 'disabled'),
        textStyle,
    ]), [theme, textStyle, size, emphasis]);

    const txtStyleToUse = disabled ? txtDisabledStyle : txtStyle;

    const loadingComponent = (
        <Loading
            color={txtStyleToUse.color}
        />
    );

    let icon: ReactNode;

    if (iconComponent) {
        icon = iconComponent;
    } else if (iconName) {
        // We wrap the icon in a view to avoid it to follow text layout
        icon = (
            <View>
                <CompassIcon
                    name={iconName!}
                    size={iconSizePerSize[size]}
                    color={txtStyleToUse.color}
                    testID={`${testID}-icon`}
                />
            </View>
        );
    }

    return (
        <ElementButton
            buttonStyle={bgStyle}
            containerStyle={buttonContainerStyle}
            disabledStyle={bgDisabledStyle}
            onPress={onPress}
            testID={testID}
            disabled={disabled}
            hitSlop={hitSlop}
        >
            <View
                style={styles.container}
                testID={`${testID}-text-container`}
            >
                {showLoader && loadingComponent}
                {!isIconOnTheRight && icon}
                <Text
                    style={txtStyleToUse}
                    numberOfLines={1}
                >
                    {text}
                </Text>
                {isIconOnTheRight && icon}
            </View>
        </ElementButton>
    );
};

export default Button;
