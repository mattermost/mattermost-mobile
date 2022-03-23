// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Note: This file has been adapted from the library https://github.com/csath/react-native-reanimated-text-input

import {debounce} from 'lodash';
import React, {useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo, useCallback} from 'react';
import {GestureResponderEvent, LayoutChangeEvent, NativeSyntheticEvent, Platform, StyleProp, TargetedEvent, Text, TextInput, TextInputFocusEventData, TextInputProps, TextStyle, TouchableWithoutFeedback, View, ViewStyle} from 'react-native';
import Animated, {useCode, interpolateNode, EasingNode, Value, set, Clock} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {timingAnimation} from './animation_utils';

const DEFAULT_INPUT_HEIGHT = 48;
const BORDER_DEFAULT_WIDTH = 1;
const BORDER_FOCUSED_WIDTH = 2;

const getTopStyle = (styles: any, animation: Value<0|1>, inputText?: string) => {
    if (inputText) {
        return getLabelPositions(styles.textInput, styles.label, styles.smallLabel)[1];
    }

    return interpolateNode(animation, {
        inputRange: [0, 1],
        outputRange: [...getLabelPositions(styles.textInput, styles.label, styles.smallLabel)],
    });
};

const getFontSize = (styles: any, animation: Value<0|1>, inputText?: string) => {
    if (inputText) {
        return styles.smallLabel.fontSize;
    }

    return interpolateNode(animation, {
        inputRange: [0, 1],
        outputRange: [styles.textInput.fontSize, styles.smallLabel.fontSize],
    });
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        height: DEFAULT_INPUT_HEIGHT + (2 * BORDER_DEFAULT_WIDTH),
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
        zIndex: 10,
    },
    smallLabel: {
        fontSize: 10,
    },
    textInput: {
        fontFamily: 'OpenSans',
        fontSize: 16,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        color: theme.centerChannelColor,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        borderWidth: BORDER_DEFAULT_WIDTH,
        backgroundColor: theme.centerChannelBg,
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

export type FloatingTextInputRef = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

type FloatingTextInputProps = TextInputProps & {
    containerStyle?: ViewStyle;
    textInputStyle?: TextStyle;
    labelTextStyle?: TextStyle;
    editable?: boolean;
    error?: string;
    errorIcon?: string;
    isKeyboardInput?: boolean;
    label: string;
    multiline?: boolean;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onPress?: (e: GestureResponderEvent) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
    placeholder?: string;
    showErrorIcon?: boolean;
    testID?: string;
    theme: Theme;
    value: string;
}

const FloatingTextInput = forwardRef<FloatingTextInputRef, FloatingTextInputProps>(({
    error,
    containerStyle,
    isKeyboardInput = true,
    editable = true,
    errorIcon = 'alert-outline',
    label = '',
    onPress = undefined,
    onFocus,
    onBlur,
    onLayout,
    showErrorIcon = true,
    placeholder,
    multiline,
    theme,
    value = '',
    textInputStyle,
    labelTextStyle,
    testID,
    ...props
}: FloatingTextInputProps, ref) => {
    const [focusedLabel, setIsFocusLabel] = useState<boolean | undefined>();
    const [focused, setIsFocused] = useState(Boolean(value) && editable);
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

    useImperativeHandle(ref, () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        isFocused: () => inputRef.current?.isFocused() || false,
    }), [inputRef]);

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

    const onTextInputBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        () => {
            setIsFocusLabel(Boolean(value));
            setIsFocused(false);
        },
        onBlur,
    ), [onBlur]);

    const onTextInputFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        () => {
            setIsFocusLabel(true);
            setIsFocused(true);
        },
        onFocus,
    ), [onFocus]);

    const onAnimatedTextPress = useCallback(() => {
        return focused ? null : inputRef?.current?.focus();
    }, [focused]);

    const shouldShowError = (!focused && error);
    const onPressAction = !isKeyboardInput && editable && onPress ? onPress : undefined;

    const combinedContainerStyle = useMemo(() => {
        const res = [styles.container];
        if (multiline) {
            res.push({height: 100 + (2 * BORDER_DEFAULT_WIDTH)});
        }
        res.push(containerStyle);
        return res;
    }, [styles, containerStyle, multiline]);

    const combinedTextInputStyle = useMemo(() => {
        const res: StyleProp<TextStyle> = [styles.textInput];
        res.push({
            borderWidth: focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH,
            height: DEFAULT_INPUT_HEIGHT + ((focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH) * 2),
        });

        if (focused) {
            res.push({borderColor: theme.buttonBg});
        } else if (shouldShowError) {
            res.push({borderColor: theme.errorTextColor});
        }

        res.push(textInputStyle);

        if (multiline) {
            res.push({height: 100, textAlignVertical: 'top'});
        }

        return res;
    }, [styles, theme, shouldShowError, focused, textInputStyle, focusedLabel, multiline]);

    const textAnimatedTextStyle = useMemo(() => {
        const res = [styles.label];
        const inputText = value || placeholder;
        res.push({
            top: getTopStyle(styles, animation, inputText),
            fontSize: getFontSize(styles, animation, inputText),
            backgroundColor: (
                focusedLabel || inputText ? theme.centerChannelBg : 'transparent'
            ),
            paddingHorizontal: focusedLabel || inputText ? 4 : 0,
            color: styles.label.color,
        });

        if (focused) {
            res.push({color: theme.buttonBg});
        }

        res.push(labelTextStyle);

        if (shouldShowError) {
            res.push({color: theme.errorTextColor});
        }

        return res;
    }, [theme, styles, focused, shouldShowError, labelTextStyle, placeholder, animation, focusedLabel]);

    return (
        <TouchableWithoutFeedback
            onPress={onPressAction}
            onLayout={onLayout}
        >
            <View style={combinedContainerStyle}>
                <Animated.Text
                    onPress={onAnimatedTextPress}
                    style={textAnimatedTextStyle}
                    suppressHighlighting={true}
                >
                    {label}
                </Animated.Text>
                <TextInput
                    {...props}
                    editable={isKeyboardInput && editable}
                    style={combinedTextInputStyle}
                    placeholder={placeholder}
                    placeholderTextColor={styles.label.color}
                    multiline={multiline}
                    value={value}
                    pointerEvents={isKeyboardInput ? 'auto' : 'none'}
                    onFocus={onTextInputFocus}
                    onBlur={onTextInputBlur}
                    ref={inputRef}
                    underlineColorAndroid='transparent'
                    testID={testID}
                />
                {Boolean(error) && (
                    <View style={styles.errorContainer}>
                        {showErrorIcon && errorIcon &&
                        <CompassIcon
                            name={errorIcon}
                            style={styles.errorIcon}
                        />
                        }
                        <Text
                            style={styles.errorText}
                            testID={`${testID}.error`}
                        >
                            {error}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
});

FloatingTextInput.displayName = 'FloatingTextInput';

export default FloatingTextInput;

