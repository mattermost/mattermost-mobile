// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Note: This file has been adapted from the library https://github.com/csath/react-native-reanimated-text-input

import {debounce} from 'lodash';
import React, {useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo, useCallback} from 'react';
import {GestureResponderEvent, LayoutChangeEvent, NativeSyntheticEvent, Pressable, StyleProp, TargetedEvent, Text, TextInput, TextInputFocusEventData, TextInputProps, TextStyle, TouchableWithoutFeedback, View, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, withTiming, Easing} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';

import {BORDER_DEFAULT_WIDTH, BORDER_FOCUSED_WIDTH, INPUT_CONTAINER_VERTICAL_SPACING} from './constants';
import {getStyleSheet} from './styles';
import {getLabelPositions, onExecution, getInputContainerHeight} from './utils';

export type FloatingTextInputRef = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

export type FloatingTextInputProps = TextInputProps & {
    containerStyle?: ViewStyle;
    editable?: boolean;
    error?: string;
    errorIcon?: string;
    isKeyboardInput?: boolean;
    label: string;
    labelTextStyle?: TextStyle;
    multiline?: boolean;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
    onPress?: (e: GestureResponderEvent) => void;
    placeholder?: string;
    showErrorIcon?: boolean;
    testID?: string;
    textInputStyle?: TextStyle;
    textInputContainerStyle?: ViewStyle;
    theme: Theme;
    value: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
}

const FloatingTextInput = forwardRef<FloatingTextInputRef, FloatingTextInputProps>(({
    containerStyle,
    editable = true,
    error,
    errorIcon = 'alert-outline',
    isKeyboardInput = true,
    label = '',
    labelTextStyle,
    multiline = false,
    onBlur,
    onFocus,
    onLayout,
    onPress,
    placeholder,
    showErrorIcon = true,
    testID,
    textInputStyle,
    theme,
    value = '',
    startAdornment,
    endAdornment,
    textInputContainerStyle,
    ...props
}: FloatingTextInputProps, ref) => {
    const [focused, setIsFocused] = useState(false);
    const [focusedLabel, setIsFocusLabel] = useState<boolean | undefined>();
    const inputRef = useRef<TextInput>(null);
    const debouncedOnFocusTextInput = debounce(setIsFocusLabel, 500, {leading: true, trailing: false});
    const styles = getStyleSheet(theme);

    const hasStartAdornment = Boolean(startAdornment);
    const hasEndAdornment = Boolean(endAdornment);
    const positions = useMemo(() => getLabelPositions(styles.textInputContainer, styles.label, styles.smallLabel), [styles]);
    const size = useMemo(() => [styles.textInput.fontSize, styles.smallLabel.fontSize], [styles]);
    const textInputContainerHeight = useMemo(() => getInputContainerHeight(multiline, textInputContainerStyle), [multiline, textInputContainerStyle]);
    const textInputHeight = useMemo(() => textInputContainerHeight - (INPUT_CONTAINER_VERTICAL_SPACING * 2), [textInputContainerHeight]);

    const onTextInputBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        // eslint-disable-next-line max-nested-callbacks
        () => {
            setIsFocusLabel(Boolean(value));
            setIsFocused(false);
        },
        onBlur,
    ), [onBlur]);

    const onTextInputFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        // eslint-disable-next-line max-nested-callbacks
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

    const combinedTextInputContainerStyle = useMemo(() => {
        const res: StyleProp<TextStyle> = [styles.textInputContainer, textInputContainerStyle, {height: textInputContainerHeight}];
        res.push({
            borderWidth: focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH,
        });

        if (focused) {
            res.push({borderColor: theme.buttonBg});
        } else if (shouldShowError) {
            res.push({borderColor: theme.errorTextColor});
        }

        if (!editable) {
            res.push(styles.readOnly);
        }

        return res;
    }, [styles, theme, shouldShowError, focused, focusedLabel, textInputContainerStyle, textInputContainerHeight]);

    const combinedTextInputStyle = useMemo(() => {
        return [styles.textInput, textInputStyle, {height: textInputHeight}];
    }, [styles, textInputStyle, textInputHeight]);

    const textAnimatedTextStyle = useAnimatedStyle(() => {
        const inputText = placeholder || value;
        const showLabelOnTop = inputText || focusedLabel || hasStartAdornment;
        const index = showLabelOnTop ? 1 : 0;
        const toValue = positions[index];
        const toSize = size[index];

        let color = styles.label.color;
        if (shouldShowError) {
            color = theme.errorTextColor;
        } else if (focused) {
            color = theme.buttonBg;
        }

        return {
            top: withTiming(toValue, {duration: 100, easing: Easing.linear}),
            fontSize: withTiming(toSize, {duration: 100, easing: Easing.linear}),
            backgroundColor: showLabelOnTop ? theme.centerChannelBg : 'transparent',
            paddingHorizontal: showLabelOnTop ? 4 : 0,
            color,
        };
    });

    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    useImperativeHandle(ref, () => ({
        blur: () => inputRef.current?.blur(),
        focus: focusInput,
        isFocused: () => inputRef.current?.isFocused() || false,
    }), [inputRef, focusInput]);

    useEffect(
        () => {
            if (!focusedLabel && value) {
                debouncedOnFocusTextInput(true);
            }
        },
        [value],
    );

    return (
        <TouchableWithoutFeedback
            onPress={onPressAction}
            onLayout={onLayout}
        >
            <View
                style={[styles.container, containerStyle]}
                testID={`${testID}.container`}
            >
                <Animated.Text
                    onPress={onAnimatedTextPress}
                    style={[styles.label, labelTextStyle, textAnimatedTextStyle]}
                    suppressHighlighting={true}
                    numberOfLines={1}
                >
                    {label}
                </Animated.Text>
                <Pressable
                    style={combinedTextInputContainerStyle}
                    onPress={focusInput}
                    disabled={!(isKeyboardInput && editable)}
                    testID={`${testID}.input_container`}
                >
                    {hasStartAdornment && (
                        <View
                            style={styles.startAdornment}
                            testID={`${testID}.start_adornment_container`}
                        >
                            {startAdornment}
                        </View>
                    )}
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
                    {hasEndAdornment && (
                        <View
                            style={styles.endAdornment}
                            testID={`${testID}.end_adornment_container`}
                        >
                            {endAdornment}
                        </View>
                    )}
                </Pressable>

                {Boolean(error) && (
                    <View style={styles.errorContainer}>
                        {showErrorIcon && errorIcon &&
                        <CompassIcon
                            name={errorIcon}
                            style={styles.errorIcon}
                            testID={`${testID}.error_icon`}
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
