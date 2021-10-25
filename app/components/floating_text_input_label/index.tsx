// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Note: This file has been adapted from the library https://github.com/csath/react-native-reanimated-text-input

import {debounce} from 'lodash';
import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet, View, TextInput, TouchableWithoutFeedback, Text, Platform, TextStyle, NativeSyntheticEvent, TextInputFocusEventData, TextInputProps, GestureResponderEvent, TargetedEvent} from 'react-native';
import Animated, {useCode, interpolateNode, EasingNode, Value, set, Clock} from 'react-native-reanimated';

import {timingAnimation} from './animation_utils';

export const DEFAULT_COLORS = {
    TEXT_INPUT_ACTIVE_COLOR: '#066acf',
    TEXT_INPUT_ACTIVE_LABEL_COLOR: '#0b78e6',
    PRIMARY_BACKGROUND_COLOR: '#fff',
    SECONDARY_TEXT_COLOR: '#8a8a8a',
    TEXT_INPUT_TEXT_COLOR: '#2b2b2b',
    TEXT_INPUT_DEFAULT_COLOR: '#8a8a8a',
    TEXT_INPUT_ERROR_COLOR: '#eb452f',
    TEXT_INPUT_BORDER_RADIUS: 4,
    TEXT_INPUT_BORDER_DEFAULT_WIDTH: 1,
};

const WIDTH = '50%';

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        marginVertical: 5,
    },
    textInput: {
        fontSize: 16,
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 15,
        color: DEFAULT_COLORS.TEXT_INPUT_TEXT_COLOR,
        borderColor: DEFAULT_COLORS.TEXT_INPUT_DEFAULT_COLOR,
        borderRadius: DEFAULT_COLORS.TEXT_INPUT_BORDER_RADIUS,
        borderWidth: DEFAULT_COLORS.TEXT_INPUT_BORDER_DEFAULT_WIDTH,
        width: '50%',
    },
    label: {
        position: 'absolute',
        left: 15,
        fontSize: 16,
        zIndex: 1,
    },
    errorText: {
        fontSize: 13,
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
});

const onExecution = (
    e: NativeSyntheticEvent<TextInputFocusEventData>,
    innerFunc?: any,
    outerFunc?: any,
) => {
    innerFunc?.(e);
    outerFunc?.(e);
};

const getAndroidExtraPadding = (_textInputFontSize: number) => {
    if (Platform.OS === 'android') {
        let defaultPadding = 6;
        if (_textInputFontSize < 14) {
            defaultPadding += (14 - _textInputFontSize);
        }
        return defaultPadding;
    }
    return 0;
};

const getLabelPositions = (style: TextStyle, labelStyle: TextStyle) => {
    const top: number = style?.paddingTop as number || 0;
    const bottom: number = style?.paddingBottom as number || 0;

    const height: number = (style?.height as number || (top + bottom) || style?.padding as number) || 0;
    const textInputFontSize = style?.fontSize || 13;
    const labelFontSize = labelStyle?.fontSize || 13;
    const fontSizeDiff = textInputFontSize - labelFontSize;

    const unfocused = (height * 0.5) + (fontSizeDiff * (Platform.OS === 'android' ? 0.5 : 0.6)) + getAndroidExtraPadding(textInputFontSize);
    const focused = -labelFontSize * 0.5;
    return [unfocused, focused];
};

type FloatingTextInputProps = TextInputProps & {
    error: string;
    errorColor: string;
    errorTextStyle: TextStyle;
    textInputStyle: TextStyle;
    labelTextStyle: TextStyle;
    containerStyle: TextStyle;
    isKeyboardInput: boolean;
    editable: boolean;
    value: string;
    label: string;
    labelTextColor: string;
    activeColor: string;
    activeLabelColor: string;
    onPress?: (e: GestureResponderEvent) => void;
    onBlur?: null | ((event: NativeSyntheticEvent<TargetedEvent>) => void) | undefined;
    onFocus?: ((e: NativeSyntheticEvent<TargetedEvent>) => void) | undefined;
}

const FloatingTextInput = ({
    error,
    errorColor = DEFAULT_COLORS.TEXT_INPUT_ERROR_COLOR,
    errorTextStyle,
    textInputStyle,
    labelTextStyle,
    containerStyle,
    isKeyboardInput = true,
    editable = true,
    value = '',
    label = '',
    labelTextColor = '',
    activeColor = DEFAULT_COLORS.TEXT_INPUT_ACTIVE_COLOR,
    activeLabelColor = DEFAULT_COLORS.TEXT_INPUT_ACTIVE_LABEL_COLOR,
    onPress = undefined,
    onFocus,
    onBlur,
    ...props
}: FloatingTextInputProps) => {
    const [focusedLabel, setIsFocusLabel] = useState(Boolean(value));
    const [focused, setIsFocused] = useState(Boolean(value));
    const inputRef = useRef<TextInput>(null);
    const [animation] = useState(new Value(focusedLabel ? 1 : 0));
    const debouncedOnFocusTextInput = debounce(setIsFocusLabel, 500, {leading: true, trailing: false});

    useCode(
        () => set(
            animation,
            timingAnimation({
                animation,
                duration: 150,
                from: focusedLabel ? 0 : 1,
                to: focusedLabel ? 1 : 0,
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
            if (focusedLabel && !value) {
                debouncedOnFocusTextInput(false);
            }
        },
        [value],
    );

    const focusStyle = {
        top: interpolateNode(animation, {
            inputRange: [0, 1],
            outputRange: [...getLabelPositions((textInputStyle || styles.textInput), (labelTextStyle || styles.label))],
        }),
        fontSize: interpolateNode(animation, {
            inputRange: [0, 1],
            outputRange: [16, 13],
        }),
        backgroundColor: (
            focusedLabel ? DEFAULT_COLORS.PRIMARY_BACKGROUND_COLOR : 'transparent'
        ),
        color: labelTextColor || DEFAULT_COLORS.SECONDARY_TEXT_COLOR,
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

    const shouldShowError = (!focused && error && errorColor);
    const activeOpacity = !isKeyboardInput && editable ? 0.2 : 1;
    const onPressAction = !isKeyboardInput && editable && onPress ? onPress : undefined;

    let textInputColorStyles;
    let labelColorStyles;

    if (focused) {
        textInputColorStyles = {borderColor: activeColor};
        labelColorStyles = {color: activeLabelColor};
    } else if (shouldShowError) {
        textInputColorStyles = {borderColor: errorColor};
    }

    const combinedTextInputStyle = [styles.textInput, textInputStyle, textInputColorStyles];
    const textAnimatedTextStyle = [styles.label, focusStyle, labelTextStyle, labelColorStyles];
    const errorStyle = [styles.errorText, {color: errorColor}, errorTextStyle];

    return (
        <TouchableWithoutFeedback
            style={[styles.container, containerStyle]}
            onPress={onPressAction}
        >
            <View>
                {
                    <Animated.Text
                        style={textAnimatedTextStyle}
                        onPress={onAnimatedTextPress}
                    >
                        {label}
                    </Animated.Text>
                }
                <TextInput
                    underlineColorAndroid={'rgba(0,0,0,0)'}
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
                />
                {!focused && error && (<Text style={errorStyle}>{error}</Text>)}
            </View>
        </TouchableWithoutFeedback>
    );
};

export default FloatingTextInput;

