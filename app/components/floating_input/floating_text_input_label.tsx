// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Note: This file has been adapted from the library https://github.com/csath/react-native-reanimated-text-input

import React, {useState, useRef, useImperativeHandle, forwardRef, useMemo, useCallback} from 'react';
import {type LayoutChangeEvent, type NativeSyntheticEvent, type StyleProp, type TargetedEvent, TextInput, type TextInputFocusEventData, type TextInputProps, type TextStyle} from 'react-native';

import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

import FloatingInputContainer from './floating_input_container';
import {onExecution} from './utils';

const DEFAULT_INPUT_HEIGHT = 48;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    input: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
        flexDirection: 'row',
        fontFamily: 'OpenSans',
        fontSize: 16,
        color: theme.centerChannelColor,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
    },
}));

export type FloatingTextInputRef = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

type FloatingTextInputProps = /*TextInputProps &*/ {
    editable?: boolean;
    endAdornment?: React.ReactNode;
    error?: string;
    errorIcon?: string;
    label: string;
    multiline?: boolean;
    multilineInputHeight?: number;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
    placeholder?: string;
    hideErrorIcon?: boolean;
    testID?: string;
    theme: Theme;
    value?: string;
    rawInput?: boolean;
    onChangeText?: TextInputProps['onChangeText'];
    defaultValue?: TextInputProps['defaultValue'];
    autoFocus?: TextInputProps['autoFocus'];
    enablesReturnKeyAutomatically?: TextInputProps['enablesReturnKeyAutomatically'];
    keyboardType?: TextInputProps['keyboardType'];
    onSubmitEditing?: TextInputProps['onSubmitEditing'];
    returnKeyType?: TextInputProps['returnKeyType'];
    secureTextEntry?: TextInputProps['secureTextEntry'];
    blurOnSubmit?: TextInputProps['blurOnSubmit'];
    autoComplete?: TextInputProps['autoComplete'];
    disableFullscreenUI?: TextInputProps['disableFullscreenUI'];
    maxLength?: TextInputProps['maxLength'];
}

const FloatingTextInput = forwardRef<FloatingTextInputRef, FloatingTextInputProps>(({
    editable = true,
    error,
    endAdornment,
    label = '',
    multiline,
    multilineInputHeight,
    onBlur,
    onFocus,
    onLayout,
    placeholder,
    hideErrorIcon = false,
    testID,
    theme,
    value,
    rawInput = false,
    ...textInputProps
}: FloatingTextInputProps, ref) => {
    const [focused, setIsFocused] = useState(false);
    const focusedLabel = Boolean(focused || Boolean(value) || placeholder);
    const inputRef = useRef<TextInput>(null);
    const styles = getStyleSheet(theme);

    useImperativeHandle(ref, () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        isFocused: () => inputRef.current?.isFocused() || false,
    }), [inputRef]);

    const onTextInputBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        () => {
            setIsFocused(false);
        },
        onBlur,
    ), [onBlur]);

    const onTextInputFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => onExecution(e,
        () => {
            setIsFocused(true);
        },
        onFocus,
    ), [onFocus]);

    const defaultHeight = multiline ? multilineInputHeight || 100 : DEFAULT_INPUT_HEIGHT;
    const combinedTextInputStyle = useMemo(() => {
        const res: StyleProp<TextStyle> = [styles.input];

        if (multiline) {
            const height = multilineInputHeight ? multilineInputHeight - 20 : 80;
            res.push({height, textAlignVertical: 'top'});
        }

        return res;
    }, [styles, multiline, multilineInputHeight]);

    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <FloatingInputContainer
            hasValue={Boolean(value)}
            defaultHeight={defaultHeight}
            onLayout={onLayout}
            label={label}
            error={error}
            hideErrorIcon={hideErrorIcon}
            theme={theme}
            focus={focus}
            focused={focused}
            focusedLabel={focusedLabel}
            editable={editable}
            testID={testID || 'floating-text-input-label'}
        >
            <TextInput
                {...textInputProps}
                editable={editable}
                style={combinedTextInputStyle}
                placeholder={placeholder}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.64)}
                multiline={multiline}
                textAlignVertical='top'
                value={value}
                onFocus={onTextInputFocus}
                onBlur={onTextInputBlur}
                ref={inputRef}
                underlineColorAndroid='transparent'
                testID={testID}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                autoCorrect={!rawInput}
                autoCapitalize={rawInput ? 'none' : undefined}
            />
            {endAdornment}
        </FloatingInputContainer>
    );
});

FloatingTextInput.displayName = 'FloatingTextInput';

export default FloatingTextInput;

