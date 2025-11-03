// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {
    useMemo,
    useCallback,
} from 'react';
import {
    type LayoutChangeEvent,
    type StyleProp,
    Text,
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
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {getLabelPositions} from './utils';

const BORDER_DEFAULT_WIDTH = 1;
const BORDER_FOCUSED_WIDTH = 2;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: '100%',
    },
    helpText: {
        color: changeOpacity(theme.centerChannelColor, 0.5),
        paddingVertical: 5,
        ...typography('Body', 75),
    },
    errorContainer: {
        flexDirection: 'row',

        // Hack to properly place text in flexbox
        borderColor: 'transparent',
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
    label: {
        position: 'absolute',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        left: 16,
        zIndex: 10,
        maxWidth: 315,
    },
    bigLabel: {
        ...typography('Body', 200),
    },
    smallLabel: {
        ...typography('Body', 25),
    },
    readOnly: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    textInput: {
        flexDirection: 'row',
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        color: theme.centerChannelColor,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        borderWidth: BORDER_DEFAULT_WIDTH,
        backgroundColor: theme.centerChannelBg,
        gap: 8,
    },
}));

type Props = {
    children: React.ReactNode;
    hasValue: boolean;
    defaultHeight: number;
    canGrow?: boolean;
    onLayout?: (e: LayoutChangeEvent) => void;
    label: string;
    error?: string;
    hideErrorIcon?: boolean;
    theme: Theme;
    focus?: () => void;
    focused: boolean;
    focusedLabel: boolean;
    editable: boolean;
    wrapChildren?: boolean;
    helpText?: string;
    testID: string;
}
const FloatingInputContainer = ({
    children,
    hasValue,
    defaultHeight,
    canGrow = false,
    onLayout,
    label,
    error,
    hideErrorIcon = false,
    theme,
    focus,
    focused,
    focusedLabel,
    editable,
    wrapChildren = false,
    helpText,
    testID,
}: Props) => {
    const styles = getStyleSheet(theme);
    const positions = useMemo(() => getLabelPositions(styles.textInput, styles.label, styles.smallLabel), [styles]);
    const errorIcon = 'alert-outline';
    const shouldShowError = !focused && error;

    const handlePressOnContainer = useCallback(() => {
        if (!focused) {
            focus?.();
        }
    }, [focus, focused]);

    const combinedTextInputContainerStyle = useMemo(() => {
        const res: StyleProp<ViewStyle> = [styles.textInput];
        if (!editable) {
            res.push(styles.readOnly);
        }
        res.push({
            borderWidth: focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH,
        });
        const height = defaultHeight + ((focusedLabel ? BORDER_FOCUSED_WIDTH : BORDER_DEFAULT_WIDTH) * 2);
        if (canGrow) {
            res.push({
                minHeight: height,
            });
        } else {
            res.push({
                height,
            });
        }

        if (focused) {
            res.push({borderColor: theme.buttonBg});
        } else if (shouldShowError) {
            res.push({borderColor: theme.errorTextColor});
        }

        if (wrapChildren) {
            res.push({flexWrap: 'wrap'});
        }

        return res;
    }, [styles.textInput, styles.readOnly, editable, focusedLabel, defaultHeight, canGrow, focused, shouldShowError, wrapChildren, theme.buttonBg, theme.errorTextColor]);

    const textAnimatedTextStyle = useAnimatedStyle(() => {
        const inputText = hasValue;
        const index = inputText || focusedLabel ? 1 : 0;

        const toValue = positions[index];

        const size = [styles.bigLabel.fontSize, styles.smallLabel.fontSize];
        const toSize = size[index] as number;

        let color = styles.label.color;
        if (shouldShowError) {
            color = theme.errorTextColor;
        } else if (focused) {
            color = theme.buttonBg;
        }

        return {
            ...(index === 1 ? styles.smallLabel : styles.bigLabel),
            top: withTiming(toValue, {duration: 100, easing: Easing.linear}),
            fontSize: withTiming(toSize, {duration: 100, easing: Easing.linear}),
            backgroundColor: focusedLabel || inputText ? theme.centerChannelBg : 'transparent',
            paddingHorizontal: focusedLabel || inputText ? 4 : 0,
            color,
        };
    }, [styles, theme, focusedLabel, hasValue, shouldShowError, positions]);

    return (
        <TouchableWithoutFeedback
            onLayout={onLayout}
        >
            <View style={styles.container}>
                <Pressable onPress={handlePressOnContainer}>
                    <Animated.Text
                        style={[styles.label, textAnimatedTextStyle]}
                        suppressHighlighting={true}
                        numberOfLines={1}
                    >
                        {label}
                    </Animated.Text>
                    <View style={combinedTextInputContainerStyle}>
                        {children}
                    </View>
                </Pressable>
                {Boolean(error) && (
                    <View style={styles.errorContainer}>
                        {!hideErrorIcon && errorIcon &&
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
                {Boolean(helpText) && (
                    <Text style={styles.helpText}>
                        {helpText}
                    </Text>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

export default FloatingInputContainer;
