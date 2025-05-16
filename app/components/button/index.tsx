// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button as ElementButton} from '@rneui/base';
import React, {useMemo, type ReactNode} from 'react';
import {type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle, type Insets} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity} from '@utils/theme';

type Props = {
    theme: Theme;
    backgroundStyle?: StyleProp<ViewStyle>;
    buttonContainerStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    size?: ButtonSize;
    emphasis?: ButtonEmphasis;
    buttonType?: ButtonType;
    buttonState?: ButtonState;
    testID?: string;
    onPress?: () => void;
    text: string;
    iconComponent?: ReactNode;
    disabled?: boolean;
    hitSlop?: Insets;
    isIconOnTheRight?: boolean;
    iconName?: string;
    showLoader?: boolean;
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
    buttonType,
    buttonState,
    onPress,
    text,
    testID,
    iconName,
    isIconOnTheRight = false,
    iconComponent,
    disabled,
    hitSlop,
    showLoader = false,
}: Props) => {
    const bgStyle = useMemo(() => [
        buttonBackgroundStyle(theme, size, emphasis, buttonType, buttonState),
        backgroundStyle,
    ], [theme, backgroundStyle, size, emphasis, buttonType, buttonState]);

    const txtStyle = useMemo(() => [
        buttonTextStyle(theme, size, emphasis, buttonType),
        textStyle,
    ], [theme, textStyle, size, emphasis, buttonType]);

    let buttonStyle = StyleSheet.flatten(bgStyle);
    if (disabled) {
        buttonStyle = {
            ...buttonStyle,
            backgroundColor: changeOpacity(buttonStyle.backgroundColor! as string, 0.4),
        };
    }

    const flattenedTxtStyle = StyleSheet.flatten(txtStyle);

    const loadingComponent = (
        <Loading
            color={flattenedTxtStyle.color}
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
                    color={flattenedTxtStyle.color}
                    testID={`${testID}-icon`}
                />
            </View>
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
            <View
                style={styles.container}
                testID={`${testID}-text-container`}
            >
                {showLoader && loadingComponent}
                {!isIconOnTheRight && icon}
                <Text
                    style={flattenedTxtStyle}
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
