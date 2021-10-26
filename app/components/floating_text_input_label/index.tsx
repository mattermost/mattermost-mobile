// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Note: This file has been adapted from the library https://github.com/csath/react-native-reanimated-text-input

import {debounce} from 'lodash';
import React, {useState, useEffect, useRef} from 'react';
import {View, TextInput, TouchableWithoutFeedback, Text, Platform, TextStyle, NativeSyntheticEvent, TextInputFocusEventData, TextInputProps, GestureResponderEvent, TargetedEvent} from 'react-native';
import Animated, {useCode, interpolateNode, EasingNode, Value, set, Clock} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {timingAnimation} from './animation_utils';

const BORDER_DEFAULT_WIDTH = 1;
const BORDER_FOCUSED_WIDTH = 2;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        height: 48,
        width: '100%',
    },
    errorContainer: {
        flexDirection: 'row',
    },
    errorIcon: {
        color: theme.errorTextColor,
        fontSize: 14,
        marginRight: 7,
        top: 5,
    },
    errorText: {
        color: theme.errorTextColor,
        fontFamily: 'OpenSans',
        fontSize: 12,
        lineHeight: 16,
        paddingVertical: 5,
    },
    label: {
        position: 'absolute',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        left: 16,
        fontFamily: 'OpenSans',
        fontSize: 16,
        zIndex: 1,
    },
    smallLabel: {
        fontSize: 10,
    },
    textInput: {
        fontFamily: 'OpenSans',
        fontSize: 16,
        lineHeight: 24,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        color: theme.centerChannelColor,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        borderWidth: BORDER_DEFAULT_WIDTH,
    },
}));

const onExecution = (
    e: NativeSyntheticEvent<TextInputFocusEventData>,
    innerFunc?: () => void,
    outerFunc?: ((event: NativeSyntheticEvent<TargetedEvent>) => void),
) => {
    innerFunc?.();
    outerFunc?.(e);
};

const getLabelPositions = (style: TextStyle, labelStyle: TextStyle, smallLabelStyle: TextStyle) => {
    const top: number = style?.paddingTop as number || 0;
    const bottom: number = style?.paddingBottom as number || 0;

    const height: number = (style?.height as number || (top + bottom) || style?.padding as number) || 0;
    const textInputFontSize = style?.fontSize || 13;
    const labelFontSize = labelStyle?.fontSize || 16;
    const smallLabelFontSize = smallLabelStyle?.fontSize || 10;
    const fontSizeDiff = textInputFontSize - labelFontSize;
    const unfocused = (height * 0.5) + (fontSizeDiff * (Platform.OS === 'android' ? 0.5 : 0.6));
    const focused = -(labelFontSize + smallLabelFontSize) * 0.25;
    return [unfocused, focused];
};

type FloatingTextInputProps = TextInputProps & {
    containerStyle?: TextStyle;
    editable?: boolean;
    error?: string;
    errorIcon?: string;
    isKeyboardInput?: boolean;
    label: string;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onPress?: (e: GestureResponderEvent) => void;
    showErrorIcon?: boolean;
    theme: Theme;
    value: string;
}

const FloatingTextInput = ({
    error,
    containerStyle,
    isKeyboardInput = true,
    editable = true,
    errorIcon = 'BRKN-alert-outline',
    label = '',
    onPress = undefined,
    onFocus,
    onBlur,
    showErrorIcon = true,
    theme,
    value = '',
    ...props
}: FloatingTextInputProps) => {
    const [focusedLabel, setIsFocusLabel] = useState<boolean | undefined>();
    const [focused, setIsFocused] = useState(Boolean(value));
    const inputRef = useRef<TextInput>(null);
    const [animation] = useState(new Value(focusedLabel ? 1 : 0));
    const debouncedOnFocusTextInput = debounce(setIsFocusLabel, 500, {leading: true, trailing: false});
    const styles = getStyleSheet(theme);
    let from = 0;
    let to = 0;
    if (focusedLabel !== undefined) {
        from = focusedLabel ? 0 : 1;
        to = focusedLabel ? 1 : 0;
    }

    useCode(
        () => set(
            animation,
            timingAnimation({
                animation,
                duration: 150,
                from,
                to,
                easing: EasingNode.linear,
                clock: new Clock(),
            }),
        ),
        [focusedLabel],
    );

    useEffect(
        () => {
            if (!focusedLabel && value) {
                debouncedOnFocusTextInput(true);
            }
        },
        [value],
    );

    const focusStyle = {
        top: interpolateNode(animation, {
            inputRange: [0, 1],
            outputRange: [...getLabelPositions(styles.textInput, styles.label, styles.smallLabel)],
        }),
        fontSize: interpolateNode(animation, {
            inputRange: [0, 1],
            outputRange: [styles.textInput.fontSize, styles.smallLabel.fontSize],
        }),
        backgroundColor: (
            focusedLabel ? theme.centerChannelBg : 'transparent'
        ),
        color: styles.label.color,
    };

    const onTextInputBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        () => {
            setIsFocusLabel(Boolean(value));
            setIsFocused(false);
        },
        onBlur,
    );

    const onTextInputFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        () => {
            setIsFocusLabel(true);
            setIsFocused(true);
        },
        onFocus,
    );

    const onAnimatedTextPress = () => {
        return focused ? null : inputRef?.current?.focus();
    };

    const shouldShowError = (!focused && error);
    const onPressAction = !isKeyboardInput && editable && onPress ? onPress : undefined;

    let textInputColorStyles;
    let labelColorStyles;

    if (focused) {
        textInputColorStyles = {borderColor: theme.buttonBg};
        labelColorStyles = {color: theme.buttonBg};
    } else if (shouldShowError) {
        textInputColorStyles = {borderColor: theme.errorTextColor};
    }

    const textInputBorder = {borderWidth: focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH};
    const combinedTextInputStyle = [styles.textInput, textInputBorder, textInputColorStyles];
    const textAnimatedTextStyle = [styles.label, focusStyle, labelColorStyles];

    if (error && !focused) {
        textAnimatedTextStyle.push({color: theme.errorTextColor});
    }

    return (
        <TouchableWithoutFeedback
            onPress={onPressAction}
        >
            <View style={[styles.container, containerStyle]}>
                {
                    <Animated.Text
                        onPress={onAnimatedTextPress}
                        style={textAnimatedTextStyle}
                        suppressHighlighting={true}
                    >
                        {label}
                    </Animated.Text>
                }
                <TextInput
                    {...props}
                    editable={isKeyboardInput && editable}
                    style={combinedTextInputStyle}
                    placeholder=''
                    placeholderTextColor='transparent'
                    value={value}
                    pointerEvents={isKeyboardInput ? 'auto' : 'none'}
                    onFocus={onTextInputFocus}
                    onBlur={onTextInputBlur}
                    ref={inputRef}
                    underlineColorAndroid='transparent'
                />
                {!focused && error && (
                    <View style={styles.errorContainer}>
                        {showErrorIcon && errorIcon &&
                        <CompassIcon
                            name={errorIcon}
                            style={styles.errorIcon}
                        />
                        }
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

export default FloatingTextInput;

