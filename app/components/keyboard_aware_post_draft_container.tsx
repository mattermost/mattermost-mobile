// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, type ReactNode} from 'react';
import {Platform, type StyleProp, StyleSheet, type ViewStyle, View, type LayoutChangeEvent} from 'react-native';
import {KeyboardGestureArea} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import {InputAccessoryViewContainer, InputAccessoryViewContent} from '@components/input_accessory_view';
import {KeyboardAnimationProvider} from '@context/keyboard_animation';
import {useInputAccessoryView} from '@hooks/useInputAccessoryView';
import {useKeyboardAwarePostDraft} from '@hooks/useKeyboardAwarePostDraft';

const isIOS = Platform.OS === 'ios';
const Wrapper = isIOS ? KeyboardGestureArea : View;

type RenderListProps = {
    listRef: ReturnType<typeof useKeyboardAwarePostDraft>['listRef'];
    contentInset: ReturnType<typeof useKeyboardAwarePostDraft>['contentInset'];
    onScroll: ReturnType<typeof useKeyboardAwarePostDraft>['onScroll'];
    keyboardCurrentHeight: ReturnType<typeof useKeyboardAwarePostDraft>['height'];
    postInputContainerHeight: number;
};

type Props = {
    children: ReactNode;
    renderList: (props: RenderListProps) => ReactNode;
    textInputNativeID: string;
    containerStyle?: StyleProp<ViewStyle>;
    isThreadView?: boolean;
    enabled?: boolean;
};

const styles = StyleSheet.create({
    gestureArea: {
        justifyContent: 'flex-end',
        flex: 1,
    },
    inputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
});

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Wrapper component that provides keyboard-aware behavior for post draft screens
 * Handles keyboard animations, scroll adjustments, and input container positioning
*/
export const KeyboardAwarePostDraftContainer = ({
    children,
    renderList,
    textInputNativeID,
    containerStyle,
    isThreadView = false,
    enabled = true,
}: Props) => {
    const {
        height: keyboardCurrentHeight,
        listRef,
        inputRef,
        contentInset,
        onScroll,
        postInputContainerHeight,
        setPostInputContainerHeight,
        inputContainerAnimatedStyle,
        keyboardHeight,
        offset,
        scroll,
        blurInput,
        focusInput,
        blurAndDismissKeyboard,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
        isInputAccessoryViewMode,
        isTransitioningFromCustomView,
    } = useKeyboardAwarePostDraft(isThreadView, enabled);

    const {
        showInputAccessoryView,
        setShowInputAccessoryView,
        lastKeyboardHeight,
        inputAccessoryViewAnimatedHeight,
    } = useInputAccessoryView({
        keyboardHeight,
        isKeyboardFullyOpen,
    });

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const newHeight = e.nativeEvent.layout.height;
        const roundedHeight = Math.round(newHeight);

        // Debounce sub-pixel layout fluctuations to prevent unnecessary re-renders.
        // React Native sometimes reports fractional pixel measurements (90.67, 91.00, 90.99)
        // that would trigger multiple state updates for the same visual height.
        // Only update if the rounded height changed by more than 0.5px (a real change).
        // This prevents jitter in FlatList paddingTop and improves performance.
        setPostInputContainerHeight((prevHeight) => {
            if (Math.abs(prevHeight - roundedHeight) > 0.5) {
                return roundedHeight;
            }
            return prevHeight;
        });
    }, [setPostInputContainerHeight]);

    // After emoji picker renders, set input container height to 0
    // This completes the transition from keyboard to emoji picker
    // while keeping the input visually at the same position
    useEffect(() => {
        if (showInputAccessoryView) {
            // Wait one frame to ensure emoji picker has rendered
            requestAnimationFrame(() => {
                keyboardHeight.value = 0;
            });
        }
    }, [showInputAccessoryView, keyboardHeight]);

    const keyboardAnimationValue = useMemo(() => ({
        height: keyboardCurrentHeight,
        inset: contentInset,
        offset,
        keyboardHeight,
        scroll,
        onScroll,
        postInputContainerHeight,
        inputRef,
        blurInput,
        focusInput,
        blurAndDismissKeyboard,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
        isInputAccessoryViewMode,
        showInputAccessoryView,
        setShowInputAccessoryView,
        lastKeyboardHeight,
        inputAccessoryViewAnimatedHeight,
        isTransitioningFromCustomView,
    }), [keyboardCurrentHeight,
        contentInset,
        offset,
        keyboardHeight,
        scroll,
        onScroll,
        postInputContainerHeight,
        inputRef,
        blurInput,
        focusInput,
        blurAndDismissKeyboard,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
        isKeyboardInTransition,
        isInputAccessoryViewMode,
        showInputAccessoryView,
        setShowInputAccessoryView,
        lastKeyboardHeight,
        inputAccessoryViewAnimatedHeight,
        isTransitioningFromCustomView,
    ]);

    const wrapperProps = useMemo(() => {
        if (isIOS) {
            return {
                textInputNativeID,
                offset: postInputContainerHeight,
                style: styles.gestureArea,
            };
        }
        return {style: styles.gestureArea};
    }, [textInputNativeID, postInputContainerHeight]);

    // On iOS, use KeyboardGestureArea for interactive keyboard dismissal
    // On Android, KeyboardGestureArea is Android 11+ only, but we want native behavior
    // So we conditionally use it only on iOS
    // KeyboardGestureArea will be a no-op on Android if rendered, but we avoid it for clarity
    const content = (
        <>
            <View style={containerStyle}>
                {renderList({
                    keyboardCurrentHeight,
                    listRef,
                    contentInset,
                    onScroll,
                    postInputContainerHeight,
                })}
            </View>
            <AnimatedView
                style={[
                    inputContainerAnimatedStyle,
                    styles.inputContainer,
                ]}
            >
                <View onLayout={onLayout}>
                    {children}
                </View>
                {showInputAccessoryView && (
                    <InputAccessoryViewContainer
                        animatedHeight={inputAccessoryViewAnimatedHeight}
                    >
                        <InputAccessoryViewContent/>
                    </InputAccessoryViewContainer>
                )}
            </AnimatedView>
        </>
    );

    return (
        <KeyboardAnimationProvider value={keyboardAnimationValue}>
            <Wrapper {...wrapperProps}>
                {content}
            </Wrapper>
        </KeyboardAnimationProvider>
    );
};

