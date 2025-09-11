// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {
    useState,
    useRef,
    useImperativeHandle,
    forwardRef,
    useCallback,
} from 'react';
import {
    type LayoutChangeEvent,
    type NativeSyntheticEvent,
    type TargetedEvent,
    TextInput,
    type TextInputFocusEventData,
    type TextInputProps,
} from 'react-native';

import {CHIP_HEIGHT} from '@components/chips/constants';
import SelectedChip from '@components/chips/selected_chip';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import FloatingInputContainer from './floating_input_container';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    input: {
        paddingHorizontal: 15,
        paddingVertical: 0,
        flexGrow: 1,
        flexShrink: 0,
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignContent: 'flex-start',
        alignItems: 'flex-start',
        textAlignVertical: 'top',
        color: theme.centerChannelColor,
        ...typography('Body', 100),
    },
}));

type Ref = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

type Props = {
    editable?: boolean;
    error?: string;
    label: string;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
    placeholder?: string;
    showErrorIcon?: boolean;
    testID?: string;
    theme: Theme;
    chipsValues?: string[];
    textInputValue: string;
    onTextInputChange: TextInputProps['onChangeText'];
    onChipRemove: (value: string) => void;
    onTextInputSubmitted: () => void;
    blurOnSubmit?: TextInputProps['blurOnSubmit'];
    returnKeyType?: TextInputProps['returnKeyType'];
}

const FloatingTextChipsInput = forwardRef<Ref, Props>(({
    textInputValue,
    onTextInputChange,
    onTextInputSubmitted,
    chipsValues,
    onChipRemove,
    theme,
    editable = true,
    error,
    label = '',
    onBlur,
    onFocus,
    onLayout,
    placeholder,
    showErrorIcon = true,
    testID,
    ...textInputProps
}, ref) => {
    const hasValues = textInputValue.length > 0 || (chipsValues?.length ?? 0) > 0;

    const [focused, setIsFocused] = useState(false);
    const focusedLabel = Boolean(focused || hasValues || placeholder);

    const inputRef = useRef<TextInput>(null);

    const styles = getStyleSheet(theme);

    // Exposes the blur, focus and isFocused methods to the parent component
    useImperativeHandle(ref, () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        isFocused: () => inputRef.current?.isFocused() || false,
    }), [inputRef]);

    const onTextInputBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(false);

        onBlur?.(e);
    }, [onBlur]);

    const onTextInputFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(true);

        onFocus?.(e);
    }, [onFocus]);

    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const height = CHIP_HEIGHT * 2.5;
    return (
        <FloatingInputContainer
            hasValue={Boolean(hasValues || placeholder)}
            defaultHeight={height}
            canGrow={true}
            onLayout={onLayout}
            label={label}
            error={error}
            hideErrorIcon={showErrorIcon}
            theme={theme}
            focus={focus}
            focused={focused}
            focusedLabel={focusedLabel}
            editable={editable}
            testID={testID || 'floating-text-chips-input'}
            wrapChildren={true}
        >
            {chipsValues && chipsValues?.length > 0 && chipsValues.map((chipValue) => (
                <SelectedChip
                    key={chipValue}
                    id={chipValue}
                    text={chipValue}
                    testID={`${testID}.${chipValue}`}
                    onRemove={onChipRemove}
                />
            ))}
            <TextInput
                {...textInputProps}
                ref={inputRef}
                testID={testID}
                placeholder={placeholder}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.64)}
                underlineColorAndroid='transparent'
                editable={editable}
                multiline={false}
                style={styles.input}
                onFocus={onTextInputFocus}
                onBlur={onTextInputBlur}
                onChangeText={onTextInputChange}
                onSubmitEditing={onTextInputSubmitted}
                value={textInputValue}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                textAlignVertical='top'
            />
        </FloatingInputContainer>
    );
});

FloatingTextChipsInput.displayName = 'FloatingTextChipsInput';
export default FloatingTextChipsInput;
