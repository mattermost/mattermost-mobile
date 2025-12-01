// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, type ReactNode} from 'react';
import {Keyboard, Platform, type StyleProp, StyleSheet, type ViewStyle, View, type LayoutChangeEvent, type GestureResponderEvent} from 'react-native';
import {KeyboardGestureArea} from 'react-native-keyboard-controller';
import Animated, {runOnJS, useAnimatedReaction, useSharedValue, withTiming} from 'react-native-reanimated';

import {InputAccessoryViewContainer, InputAccessoryViewContent} from '@components/input_accessory_view';
import {KeyboardAnimationProvider} from '@context/keyboard_animation';
import {useWindowDimensions} from '@hooks/device';
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
    onTouchMove?: (event: GestureResponderEvent) => void;
    onTouchEnd?: () => void;
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
    const {height: windowHeight} = useWindowDimensions();

    const {
        height: keyboardCurrentHeight,
        listRef,
        inputRef,
        contentInset: inset,
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

    // Refs for tracking emoji picker swipe-to-dismiss gesture
    const previousTouchYRef = useRef<number | null>(null);
    const lastDistanceFromBottomRef = useRef<number | null>(null);
    const lastIsSwipingDownRef = useRef<boolean | null>(null);
    const originalEmojiPickerHeightRef = useRef<number>(0);
    const isGestureActiveRef = useRef<boolean>(false);
    const gestureStartedInEmojiPickerRef = useRef<boolean>(false);

    // Shared value to track scroll adjustment during emoji picker animation
    const animatedScrollAdjustment = useSharedValue(0);

    // Callback to perform scroll adjustment
    const performScrollAdjustment = useCallback((scrollOffset: number) => {
        listRef.current?.scrollToOffset({
            offset: scrollOffset,
            animated: false,
        });
    }, [listRef]);

    // React to animatedScrollAdjustment changes and scroll the list accordingly
    // This enables smooth scrolling as emoji picker animates
    useAnimatedReaction(
        () => animatedScrollAdjustment.value,
        (current, previous) => {
            // Only scroll if value actually changed and is valid
            if (previous !== null && current !== previous && current !== 0) {
                runOnJS(performScrollAdjustment)(current);
            }
        },
        [animatedScrollAdjustment],
    );

    // Handle touch move: track finger position and adjust emoji picker height
    const handleTouchMove = useCallback((event: GestureResponderEvent) => {
        if (!showInputAccessoryView || Keyboard.isVisible()) {
            return;
        }

        // Get finger Y position on screen
        const fingerY = event.nativeEvent.touches[0]?.pageY;
        if (!fingerY) {
            return;
        }

        // On first touch, check if gesture started within emoji picker bounds
        if (!isGestureActiveRef.current) {
            const currentEmojiPickerHeight = inputAccessoryViewAnimatedHeight.value;
            const emojiPickerTopEdge = windowHeight - postInputContainerHeight - currentEmojiPickerHeight;
            const emojiPickerBottomEdge = windowHeight - postInputContainerHeight;

            // Check if touch is within emoji picker area
            const isTouchInEmojiPicker = fingerY >= emojiPickerTopEdge && fingerY <= emojiPickerBottomEdge;

            if (!isTouchInEmojiPicker) {
                return;
            }

            isGestureActiveRef.current = true;
            gestureStartedInEmojiPickerRef.current = true;
        }

        // Only process if gesture started in emoji picker
        if (!gestureStartedInEmojiPickerRef.current) {
            return;
        }

        // Calculate distance from bottom of screen
        const distanceFromBottom = windowHeight - fingerY;

        // Subtract input container height to get emoji picker height
        const emojiPickerHeight = distanceFromBottom - postInputContainerHeight;

        const isSwipingDown = previousTouchYRef.current !== null && fingerY > previousTouchYRef.current;
        const maxHeight = originalEmojiPickerHeightRef.current;

        const clampedHeight = Math.max(0, Math.min(emojiPickerHeight, maxHeight));

        inputAccessoryViewAnimatedHeight.value = clampedHeight;
        inset.value = clampedHeight;
        lastDistanceFromBottomRef.current = clampedHeight;
        lastIsSwipingDownRef.current = isSwipingDown;
        previousTouchYRef.current = fingerY;
    }, [showInputAccessoryView, postInputContainerHeight, inputAccessoryViewAnimatedHeight, inset, windowHeight]);

    // Callback to dismiss emoji picker after animation completes
    const dismissEmojiPicker = useCallback(() => {
        setShowInputAccessoryView(false);
        isInputAccessoryViewMode.value = false;
        inset.value = 0;
        offset.value = 0;
        keyboardHeight.value = 0;
    }, [setShowInputAccessoryView, isInputAccessoryViewMode, inset, offset, keyboardHeight]);

    const closeInputAccessoryView = useCallback(() => {
        setShowInputAccessoryView(false);
        isInputAccessoryViewMode.value = false;
        isTransitioningFromCustomView.value = false;

        inputAccessoryViewAnimatedHeight.value = withTiming(0, {duration: 200});
        inset.value = withTiming(0, {duration: 200});
        offset.value = withTiming(0, {duration: 200});
        keyboardHeight.value = 0;
    }, [inputAccessoryViewAnimatedHeight, inset, offset, keyboardHeight, setShowInputAccessoryView, isInputAccessoryViewMode, isTransitioningFromCustomView]);

    // Handle touch end: decide whether to collapse or expand emoji picker
    const handleTouchEnd = useCallback(() => {
        isGestureActiveRef.current = false;

        // Only process if gesture started in emoji picker
        if (!gestureStartedInEmojiPickerRef.current) {
            gestureStartedInEmojiPickerRef.current = false;
            return;
        }

        if (lastDistanceFromBottomRef.current !== null && lastIsSwipingDownRef.current !== null) {
            const currentInsetHeight = lastDistanceFromBottomRef.current;
            const currentScrollValue = scroll.value;

            if (lastIsSwipingDownRef.current) {
                // User was swiping DOWN → Collapse and dismiss emoji picker
                // Calculate scroll positions: as inset decreases from current to 0,
                // list should scroll from current position to final position
                const startScrollOffset = -currentInsetHeight + currentScrollValue;
                const endScrollOffset = currentScrollValue;

                // Animate emoji picker height to 0
                inputAccessoryViewAnimatedHeight.value = withTiming(
                    0,
                    {duration: 250},
                    () => {
                        runOnJS(dismissEmojiPicker)();
                    },
                );
                inset.value = withTiming(0, {duration: 250});

                // Animate scroll position from start to end - this makes list scroll down smoothly
                animatedScrollAdjustment.value = startScrollOffset;
                animatedScrollAdjustment.value = withTiming(endScrollOffset, {
                    duration: 250,
                }, () => {
                    animatedScrollAdjustment.value = 0;
                });
            } else {
                // User was swiping UP → Expand to full height
                const targetHeight = originalEmojiPickerHeightRef.current;

                // Calculate scroll positions: as inset increases from current to targetHeight,
                // list should scroll from current position to final position
                const startScrollOffset = -currentInsetHeight + currentScrollValue;
                const endScrollOffset = -targetHeight + currentScrollValue;

                inputAccessoryViewAnimatedHeight.value = withTiming(targetHeight, {duration: 250});
                inset.value = withTiming(targetHeight, {duration: 250});

                // Animate scroll position from start to end - this makes list scroll up smoothly
                animatedScrollAdjustment.value = startScrollOffset;
                animatedScrollAdjustment.value = withTiming(endScrollOffset, {
                    duration: 250,
                }, () => {
                    animatedScrollAdjustment.value = 0;
                });
            }
        }

        previousTouchYRef.current = null;
        lastDistanceFromBottomRef.current = null;
        lastIsSwipingDownRef.current = null;
        gestureStartedInEmojiPickerRef.current = false;
    }, [inputAccessoryViewAnimatedHeight, dismissEmojiPicker, inset, scroll, animatedScrollAdjustment]);

    // After emoji picker renders, adjust heights and scroll to keep messages visible
    useEffect(() => {
        if (showInputAccessoryView) {
            // Wait one frame to ensure emoji picker has rendered
            requestAnimationFrame(() => {
                const emojiPickerHeight = inputAccessoryViewAnimatedHeight.value;
                const currentScroll = scroll.value;

                // Save original emoji picker height for gesture tracking
                originalEmojiPickerHeightRef.current = emojiPickerHeight;

                // Reset keyboard height to 0 (removes translateY, emoji picker height replaces it)
                keyboardHeight.value = 0;

                // Set inset to emoji picker height (adds bottom padding to list)
                inset.value = emojiPickerHeight;

                // Set offset to emoji picker height (same as keyboard behavior)
                offset.value = emojiPickerHeight;

                listRef.current?.scrollToOffset({
                    offset: -emojiPickerHeight + currentScroll,
                    animated: false,
                });
            });
        }

        // Only depend on showInputAccessoryView - the effect should only run when emoji picker visibility changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showInputAccessoryView]);

    const keyboardAnimationValue = useMemo(() => ({
        height: keyboardCurrentHeight,
        inset,
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
        closeInputAccessoryView,
    }), [keyboardCurrentHeight,
        inset,
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
        closeInputAccessoryView,
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
                    contentInset: inset,
                    onScroll,
                    postInputContainerHeight,
                    onTouchMove: handleTouchMove,
                    onTouchEnd: handleTouchEnd,
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

