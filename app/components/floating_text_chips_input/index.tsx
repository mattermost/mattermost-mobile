// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {
    useState,
    useRef,
    useImperativeHandle,
    forwardRef,
    useMemo,
    useCallback,
} from 'react';
import {
    type GestureResponderEvent,
    type LayoutChangeEvent,
    type NativeSyntheticEvent,
    type StyleProp,
    type TargetedEvent,
    Text,
    TextInput,
    type TextInputFocusEventData,
    type TextInputProps,
    type TextStyle,
    TouchableWithoutFeedback,
    View,
    type ViewStyle,
    Pressable,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import SelectedChip, {USER_CHIP_HEIGHT} from '@components/selected_chip';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {getLabelPositions} from './utils';

const BORDER_DEFAULT_WIDTH = 1;
const BORDER_FOCUSED_WIDTH = 2;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: '100%',
    },
    errorContainer: {
        flexDirection: 'row',
        borderColor: 'transparent', // Hack to properly place text in flexbox
        borderWidth: 1,
    },
    errorIcon: {
        color: theme.errorTextColor,
        marginRight: 7,
        top: 5,
        ...typography('Body', 100),
    },
    errorText: {
        color: theme.errorTextColor,
        paddingVertical: 5,
        ...typography('Body', 75),
    },
    input: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
        height: USER_CHIP_HEIGHT,
        flexGrow: 1,
        flexShrink: 0,
        flexBasis: 'auto',
        alignSelf: 'stretch',
    },
    label: {
        ...typography('Body', 200),
        position: 'absolute',
        lineHeight: 16,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        left: 16,
        zIndex: 10,
    },
    readOnly: {
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.16),
    },
    smallLabel: {
        ...typography('Body', 25),
    },
    textInput: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignContent: 'flex-start',
        alignItems: 'flex-start',
        textAlignVertical: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        color: theme.centerChannelColor,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        borderWidth: BORDER_DEFAULT_WIDTH,
        backgroundColor: theme.centerChannelBg,
        ...typography('Body', 200),
    },
    chipContainer: {
        flexGrow: 0,
        flexShrink: 1,
        flexBasis: 'auto',
        alignSelf: 'auto',
    },
}));

export type Ref = {
    blur: () => void;
    focus: () => void;
    isFocused: () => boolean;
}

type TextInputPropsFiltered = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'>;

type Props = TextInputPropsFiltered & {
    containerStyle?: StyleProp<ViewStyle>;
    editable?: boolean;
    error?: string;
    errorIcon?: string;
    isKeyboardInput?: boolean;
    label: string;
    labelTextStyle?: TextStyle;
    onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
    onFocus?: (e: NativeSyntheticEvent<TargetedEvent>) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
    onPress?: (e: GestureResponderEvent) => void;
    placeholder?: string;
    showErrorIcon?: boolean;
    testID?: string;
    textInputStyle?: TextStyle;
    theme: Theme;
    chipsValues?: string[];
    textInputValue: string;
    onTextInputChange: TextInputProps['onChangeText'];
    onChipRemove: (value: string) => void;
    onTextInputSubmitted: () => void;
}

const FloatingTextChipsInput = forwardRef<Ref, Props>(({
    textInputValue,
    textInputStyle,
    onTextInputChange,
    onTextInputSubmitted,
    chipsValues,
    onChipRemove,
    theme,
    containerStyle,
    editable = true,
    error,
    errorIcon = 'alert-outline',
    isKeyboardInput = true,
    label = '',
    labelTextStyle,
    onBlur,
    onFocus,
    onLayout,
    onPress,
    placeholder,
    showErrorIcon = true,
    testID,
    ...restProps
}, ref) => {
    const [focused, setIsFocused] = useState(false);
    const [focusedLabel, setIsFocusLabel] = useState<boolean | undefined>();

    const inputRef = useRef<TextInput>(null);

    const styles = getStyleSheet(theme);

    const hasValues = textInputValue.length > 0 || (chipsValues?.length ?? 0) > 0;

    const shouldShowError = !focused && error;

    const positions = useMemo(() => getLabelPositions(styles.textInput, styles.label, styles.smallLabel), [styles]);

    // Exposes the blur, focus and isFocused methods to the parent component
    useImperativeHandle(ref, () => ({
        blur: () => inputRef.current?.blur(),
        focus: () => inputRef.current?.focus(),
        isFocused: () => inputRef.current?.isFocused() || false,
    }), [inputRef]);

    const onTextInputBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocusLabel(hasValues);
        setIsFocused(false);

        onBlur?.(e);
    }, [onBlur, hasValues]);

    const onTextInputFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocusLabel(true);
        setIsFocused(true);

        onFocus?.(e);
    }, [onFocus]);

    function handlePressOnContainer() {
        if (!focused) {
            inputRef?.current?.focus();
        }
    }

    function handleTouchableOnPress(event: GestureResponderEvent) {
        if (!isKeyboardInput && editable && onPress) {
            onPress(event);
        }
    }

    const textInputContainerStyles = useMemo(() => {
        const res: StyleProp<TextStyle> = [styles.textInput];
        if (!editable) {
            res.push(styles.readOnly);
        }
        res.push({
            borderWidth: focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH,
            minHeight: (USER_CHIP_HEIGHT * 2.5) + ((focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH) * 2),
        });

        if (focused) {
            res.push({borderColor: theme.buttonBg});
        } else if (shouldShowError) {
            res.push({borderColor: theme.errorTextColor});
        }

        res.push(textInputStyle);
        return res;
    }, [styles, theme, shouldShowError, focused, textInputStyle, focusedLabel, editable]);

    const textAnimatedTextStyle = useAnimatedStyle(() => {
        const inputText = placeholder || hasValues;
        const index = inputText || focusedLabel ? 1 : 0;

        const toValue = positions[index];

        const size = [styles.textInput.fontSize, styles.smallLabel.fontSize];
        const toSize = size[index] as number;

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
            onPress={handleTouchableOnPress}
            onLayout={onLayout}
        >
            <View style={[styles.container, containerStyle]}>
                <Pressable onPress={handlePressOnContainer}>
                    <Animated.Text
                        style={[styles.label, labelTextStyle, textAnimatedTextStyle]}
                        suppressHighlighting={true}
                        numberOfLines={1}
                    >
                        {label}
                    </Animated.Text>
                    <View style={textInputContainerStyles}>
                        {chipsValues && chipsValues?.length > 0 && chipsValues.map((chipValue) => (
                            <SelectedChip
                                key={chipValue}
                                id={chipValue}
                                text={chipValue}
                                onRemove={onChipRemove}
                                containerStyle={styles.chipContainer}
                            />
                        ))}
                        <TextInput
                            {...restProps}
                            ref={inputRef}
                            testID={testID}
                            placeholder={placeholder}
                            placeholderTextColor={styles.label.color}
                            pointerEvents={isKeyboardInput ? 'auto' : 'none'}
                            underlineColorAndroid='transparent'
                            editable={isKeyboardInput && editable}
                            multiline={false}
                            style={[styles.textInput, styles.input, textInputStyle]}
                            onFocus={onTextInputFocus}
                            onBlur={onTextInputBlur}
                            onChangeText={onTextInputChange}
                            onSubmitEditing={onTextInputSubmitted}
                            value={textInputValue}
                        />
                    </View>
                </Pressable>
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

FloatingTextChipsInput.displayName = 'FloatingTextChipsInput';
export default FloatingTextChipsInput;
