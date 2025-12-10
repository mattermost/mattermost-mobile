// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {DeviceEventEmitter, Keyboard, Platform, type StyleProp, StyleSheet, type ViewStyle, View, type LayoutChangeEvent, type GestureResponderEvent} from 'react-native';
import {KeyboardGestureArea} from 'react-native-keyboard-controller';
import Animated, {runOnJS, useAnimatedReaction, useSharedValue, withTiming} from 'react-native-reanimated';

import {InputAccessoryViewContainer, InputAccessoryViewContent} from '@components/input_accessory_view';
import {Events} from '@constants';
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

    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = useState(false);

    // Ref to store cursor position from PostInput
    const cursorPositionRef = useRef<number>(0);

    // Function to register cursor position updates from PostInput
    const registerCursorPosition = useCallback((cursorPosition: number) => {
        cursorPositionRef.current = cursorPosition;
    }, []);

    // Refs to store PostInput callbacks
    const updateValueRef = useRef<React.Dispatch<React.SetStateAction<string>> | null>(null);
    const updateCursorPositionRef = useRef<React.Dispatch<React.SetStateAction<number>> | null>(null);

    // Function to register PostInput callbacks
    const registerPostInputCallbacks = useCallback((
        updateValueFn: React.Dispatch<React.SetStateAction<string>>,
        updateCursorPositionFn: React.Dispatch<React.SetStateAction<number>>,
    ) => {
        updateValueRef.current = updateValueFn;
        updateCursorPositionRef.current = updateCursorPositionFn;

        if (updateValueFn) {
            updateValueFn((currentValue: string) => {
                cursorPositionRef.current = currentValue.length;
                return currentValue;
            });
        }
    }, []);

    // Ref to track if a layout update is already scheduled
    const layoutUpdateScheduledRef = useRef(false);
    const pendingHeightRef = useRef<number | null>(null);

    // Helper to apply the batched height update
    const applyBatchedHeightUpdate = useCallback(() => {
        layoutUpdateScheduledRef.current = false;

        if (pendingHeightRef.current !== null) {
            const heightToSet = pendingHeightRef.current;
            pendingHeightRef.current = null;

            // Only update if the rounded height changed by more than 0.5px (a real change).
            // This prevents jitter in FlatList paddingTop and improves performance.
            setPostInputContainerHeight((prevHeight) => {
                const roundedPrevHeight = Math.round(prevHeight);
                if (roundedPrevHeight !== heightToSet) {
                    return heightToSet;
                }
                return prevHeight;
            });
        }
    }, [setPostInputContainerHeight]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const newHeight = e.nativeEvent.layout.height;
        const roundedHeight = Math.round(newHeight);

        // Store the latest height value
        pendingHeightRef.current = roundedHeight;

        // If an update is already scheduled, skip scheduling another one
        // This batches all layout updates during animations to a single update per frame
        if (layoutUpdateScheduledRef.current) {
            return;
        }

        // Schedule update for next frame to batch rapid layout changes during animations
        layoutUpdateScheduledRef.current = true;
        requestAnimationFrame(applyBatchedHeightUpdate);
    }, [applyBatchedHeightUpdate]);

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
        const fingerY = event.nativeEvent.pageY;
        if (fingerY == null) {
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
        const maxHeight = originalEmojiPickerHeightRef.current;
        const clampedHeight = emojiPickerHeight < 0 ? 0 : Math.min(emojiPickerHeight, maxHeight);

        inputAccessoryViewAnimatedHeight.value = clampedHeight;
        inset.value = clampedHeight;
        lastDistanceFromBottomRef.current = clampedHeight;
        lastIsSwipingDownRef.current = previousTouchYRef.current !== null && fingerY > previousTouchYRef.current;
        previousTouchYRef.current = fingerY;
    }, [showInputAccessoryView, postInputContainerHeight, inputAccessoryViewAnimatedHeight, inset, windowHeight]);

    // Callback to dismiss emoji picker after animation completes
    const dismissEmojiPicker = useCallback(() => {
        // Reset emoji search focus when dismissing emoji picker
        setIsEmojiSearchFocused(false);
        setShowInputAccessoryView(false);
        isInputAccessoryViewMode.value = false;
        inset.value = 0;
        offset.value = 0;
        keyboardHeight.value = 0;
    }, [setShowInputAccessoryView, isInputAccessoryViewMode, inset, offset, keyboardHeight, setIsEmojiSearchFocused]);

    const closeInputAccessoryView = useCallback(() => {
        // Reset emoji search focus when closing emoji picker
        setIsEmojiSearchFocused(false);
        setShowInputAccessoryView(false);
        isInputAccessoryViewMode.value = false;
        isTransitioningFromCustomView.value = false;

        inputAccessoryViewAnimatedHeight.value = withTiming(0, {duration: 200});
        inset.value = withTiming(0, {duration: 200});
        offset.value = withTiming(0, {duration: 200});
        keyboardHeight.value = 0;
    }, [inputAccessoryViewAnimatedHeight, inset, offset, keyboardHeight, setShowInputAccessoryView, isInputAccessoryViewMode, isTransitioningFromCustomView, setIsEmojiSearchFocused]);

    const scrollToEnd = useCallback(() => {
        const activeHeight = Math.max(keyboardHeight.value, inputAccessoryViewAnimatedHeight.value);
        const targetOffset = -activeHeight;

        listRef.current?.scrollToOffset({offset: targetOffset, animated: true});
    }, [listRef, keyboardHeight, inputAccessoryViewAnimatedHeight]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.CLOSE_INPUT_ACCESSORY_VIEW, () => {
            closeInputAccessoryView();
        });

        return () => listener.remove();
    }, [closeInputAccessoryView]);

    // Handle touch end: decide whether to collapse or expand emoji picker
    const handleTouchEnd = useCallback(() => {
        isGestureActiveRef.current = false;

        // Only process if gesture started in emoji picker
        if (!gestureStartedInEmojiPickerRef.current) {
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

    useLayoutEffect(() => {
        if (showInputAccessoryView && Platform.OS === 'ios') {
            keyboardHeight.value = 0;
        }
    }, [showInputAccessoryView, keyboardHeight]);

    // After emoji picker renders, adjust heights and scroll to keep messages visible
    useEffect(() => {
        if (showInputAccessoryView) {
            // Wait one frame to ensure emoji picker has rendered
            requestAnimationFrame(() => {
                const emojiPickerHeight = inputAccessoryViewAnimatedHeight.value;
                const currentScroll = scroll.value;

                originalScrollBeforeEmojiPicker.value = currentScroll;
                originalEmojiPickerHeightRef.current = emojiPickerHeight;

                // For inverted list: when inset increases, content shifts UP visually. Scroll UP to compensate.
                const targetContentOffset = currentScroll - emojiPickerHeight;

                inset.value = emojiPickerHeight;
                offset.value = emojiPickerHeight;

                listRef.current?.scrollToOffset({
                    offset: targetContentOffset,
                    animated: false,
                });
            });
        }

        // Only depend on showInputAccessoryView - the effect should only run when emoji picker visibility changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showInputAccessoryView]);

    // Track if we've already restored scroll for current emoji picker closing (Android only)
    // Use SharedValue instead of ref so it can be accessed in worklets
    const hasRestoredScrollForEmojiPicker = useSharedValue(false);

    // Store the original scroll value when emoji picker opens, so we can restore it when closing
    const originalScrollBeforeEmojiPicker = useSharedValue(0);

    // Reset restoration flag when emoji picker opens
    useEffect(() => {
        if (showInputAccessoryView) {
            hasRestoredScrollForEmojiPicker.value = false;
            originalScrollBeforeEmojiPicker.value = 0;
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showInputAccessoryView]);

    // Callback to restore scroll when emoji picker closes (called from worklet)
    const restoreScrollAfterEmojiPickerClose = useCallback((previousHeight: number, currentScroll: number) => {
        if (listRef.current && previousHeight > 0) {
            listRef.current.scrollToOffset({
                offset: currentScroll,
                animated: false,
            });
        }

        // ref is not required to be in deps because it is a stable reference
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Android: Watch for emoji picker closing and restore scroll position when both height and inset reach 0
    const isAndroid = Platform.OS === 'android';
    useAnimatedReaction(
        () => ({
            height: inputAccessoryViewAnimatedHeight.value,
            inset: inset.value,
        }),
        (current, previous) => {
            if (!isAndroid) {
                return;
            }

            // When emoji picker closes: height goes to 0 AND inset reaches 0. Check previous.inset > 0 because inset affects scroll.
            const shouldRestoreScroll = previous !== null &&
                previous.inset !== undefined &&
                previous.inset > 0 &&
                current.height === 0 &&
                current.inset === 0 &&
                !hasRestoredScrollForEmojiPicker.value;

            if (shouldRestoreScroll) {
                hasRestoredScrollForEmojiPicker.value = true;
                const currentScroll = scroll.value;
                const emojiPickerHeight = previous.inset;

                runOnJS(restoreScrollAfterEmojiPickerClose)(emojiPickerHeight, currentScroll);
            }
        },
        [inputAccessoryViewAnimatedHeight, inset, scroll, restoreScrollAfterEmojiPickerClose],
    );

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
        scrollToEnd,
        isEmojiSearchFocused,
        setIsEmojiSearchFocused,
        cursorPositionRef,
        registerCursorPosition,
        updateValue: updateValueRef.current,
        updateCursorPosition: updateCursorPositionRef.current,
        registerPostInputCallbacks,
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
        scrollToEnd,
        isEmojiSearchFocused,
        setIsEmojiSearchFocused,
        registerCursorPosition,
        registerPostInputCallbacks,
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

