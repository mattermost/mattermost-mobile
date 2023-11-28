// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Note: This file has been adapted from the library https://github.com/csath/react-native-reanimated-text-input

import {debounce} from 'lodash';
import React, {useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo, useCallback} from 'react';
import {type GestureResponderEvent, type LayoutChangeEvent, type NativeSyntheticEvent, type StyleProp, type TargetedEvent, Text, TextInput, type TextInputFocusEventData, type TextInputProps, type TextStyle, TouchableWithoutFeedback, View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, withTiming, Easing} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {getLabelPositions, onExecution} from './utils';

const DEFAULT_INPUT_HEIGHT = 48;
const BORDER_DEFAULT_WIDTH = 1;
const BORDER_FOCUSED_WIDTH = 2;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: '100%',
    },
    errorContainer: {
        flexDirection: 'row',

        // Hack to properly place text in flexbox
        borderColor: 'transparent',
        borderWidth: 1,
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
    input: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
    },
    label: {
        position: 'absolute',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        left: 16,
        fontFamily: 'OpenSans',
        fontSize: 16,
        zIndex: 10,
        maxWidth: 315,
    },
    readOnly: {
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.16),
    },
    smallLabel: {
        fontSize: 10,
    },
    textInput: {
        flexDirection: 'row',
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

export type FloatingTextInputRef = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

type FloatingTextInputProps = TextInputProps & {
    containerStyle?: ViewStyle;
    editable?: boolean;
    endAdornment?: React.ReactNode;
    error?: string;
    errorIcon?: string;
    isKeyboardInput?: boolean;
    label: string;
    labelTextStyle?: TextStyle;
    multiline?: boolean;
    multilineInputHeight?: number;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
    onPress?: (e: GestureResponderEvent) => void;
    placeholder?: string;
    showErrorIcon?: boolean;
    testID?: string;
    textInputStyle?: TextStyle;
    theme: Theme;
    value?: string;
}

const FloatingTextInput = forwardRef<FloatingTextInputRef, FloatingTextInputProps>(({
    containerStyle,
    editable = true,
    error,
    errorIcon = 'alert-outline',
    endAdornment,
    isKeyboardInput = true,
    label = '',
    labelTextStyle,
    multiline,
    multilineInputHeight,
    onBlur,
    onFocus,
    onLayout,
    onPress,
    placeholder,
    showErrorIcon = true,
    testID,
    textInputStyle,
    theme,
    value,
    ...props
}: FloatingTextInputProps, ref) => {
    const [focused, setIsFocused] = useState(false);
    const [focusedLabel, setIsFocusLabel] = useState<boolean | undefined>();
    const inputRef = useRef<TextInput>(null);
    const debouncedOnFocusTextInput = debounce(setIsFocusLabel, 500, {leading: true, trailing: false});
    const styles = getStyleSheet(theme);

    const positions = useMemo(() => getLabelPositions(styles.textInput, styles.label, styles.smallLabel), [styles]);
    const size = useMemo(() => [styles.textInput.fontSize, styles.smallLabel.fontSize], [styles]);

    useImperativeHandle(ref, () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        isFocused: () => inputRef.current?.isFocused() || false,
    }), [inputRef]);

    useEffect(
        () => {
            if (!focusedLabel && (value || props.defaultValue)) {
                debouncedOnFocusTextInput(true);
            }
        },
        [value, props.defaultValue],
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
        return [styles.container, containerStyle];
    }, [styles, containerStyle]);

    const combinedTextInputContainerStyle = useMemo(() => {
        const res: StyleProp<TextStyle> = [styles.textInput];
        if (!editable) {
            res.push(styles.readOnly);
        }
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
            const height = multilineInputHeight || 100;
            res.push({height, textAlignVertical: 'top'});
        }

        return res;
    }, [styles, theme, shouldShowError, focused, textInputStyle, focusedLabel, multiline, multilineInputHeight, editable]);

    const combinedTextInputStyle = useMemo(() => {
        const res: StyleProp<TextStyle> = [styles.textInput, styles.input, textInputStyle];

        if (multiline) {
            const height = multilineInputHeight ? multilineInputHeight - 20 : 80;
            res.push({height, textAlignVertical: 'top'});
        }

        return res;
    }, [styles, theme, shouldShowError, focused, textInputStyle, focusedLabel, multiline, multilineInputHeight, editable]);

    const textAnimatedTextStyle = useAnimatedStyle(() => {
        const inputText = placeholder || value || props.defaultValue;
        const index = inputText || focusedLabel ? 1 : 0;
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
            backgroundColor: focusedLabel || inputText ? theme.centerChannelBg : 'transparent',
            paddingHorizontal: focusedLabel || inputText ? 4 : 0,
            color,
        };
    });

    return (
        <TouchableWithoutFeedback
            onPress={onPressAction}
            onLayout={onLayout}
        >
            <View style={combinedContainerStyle}>
                <Animated.Text
                    onPress={onAnimatedTextPress}
                    style={[styles.label, labelTextStyle, textAnimatedTextStyle]}
                    suppressHighlighting={true}
                    numberOfLines={1}
                >
                    {label}
                </Animated.Text>
                <View style={combinedTextInputContainerStyle}>
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
                    {endAdornment}
                </View>
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

