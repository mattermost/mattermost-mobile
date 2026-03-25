// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {BackHandler, DeviceEventEmitter, Keyboard, Platform, type StyleProp, StyleSheet, type ViewStyle, View, type LayoutChangeEvent, type GestureResponderEvent} from 'react-native';
import {KeyboardGestureArea} from 'react-native-keyboard-controller';
import Animated, {runOnJS, useAnimatedReaction, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {InputAccessoryViewContainer, InputAccessoryViewContent} from '@components/input_accessory_view';
import {Events} from '@constants';
import {KeyboardAnimationProvider} from '@context/keyboard_animation';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import {useInputAccessoryView} from '@hooks/useInputAccessoryView';
import {useKeyboardAwarePostDraft} from '@hooks/useKeyboardAwarePostDraft';

const isIOS = Platform.OS === 'ios';
const Wrapper = isIOS ? KeyboardGestureArea : View;

type RenderListProps = {
    listRef: ReturnType<typeof useKeyboardAwarePostDraft>['listRef'];
    contentInset: ReturnType<typeof useKeyboardAwarePostDraft>['contentInset'];
    onScroll: ReturnType<typeof useKeyboardAwarePostDraft>['onScroll'];
    keyboardCurrentHeight: ReturnType<typeof useKeyboardAwarePostDraft>['keyboardTranslateY'];
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
    onEmojiSearchFocusChange?: (focused: boolean) => void;
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
    onEmojiSearchFocusChange,
}: Props) => {
    const {height: windowHeight} = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const effectiveWindowHeight = isTablet ? windowHeight : windowHeight - insets.bottom;

    const {
        keyboardTranslateY: keyboardCurrentHeight,
        listRef,
        inputRef,
        contentInset: bottomInset,
        onScroll,
        postInputContainerHeight,
        setPostInputContainerHeight,
        inputContainerAnimatedStyle,
        keyboardHeight,
        scrollOffset,
        scrollPosition,
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

    useEffect(() => {
        onEmojiSearchFocusChange?.(isEmojiSearchFocused);
    }, [isEmojiSearchFocused, onEmojiSearchFocusChange]);

    // Ref to store cursor position from PostInput
    const cursorPositionRef = useRef<number>(0);

    // Ref to track if we're transitioning to emoji picker (to preserve cursor position)
    const isOpeningEmojiPickerRef = useRef<boolean>(false);

    // Ref to store preserved cursor position when opening emoji picker
    const preservedCursorPositionRef = useRef<number | null>(null);

    // Ref to store the last cursor position before emoji picker opened
    // This is kept even after emoji picker opens to detect late resets
    const lastCursorPositionBeforeEmojiPickerRef = useRef<number | null>(null);

    // Function to preserve cursor position when opening emoji picker
    const preserveCursorPositionForEmojiPicker = useCallback(() => {
        preservedCursorPositionRef.current = cursorPositionRef.current;
        lastCursorPositionBeforeEmojiPickerRef.current = cursorPositionRef.current;
        isOpeningEmojiPickerRef.current = true;
    }, []);

    // Function to register cursor position updates from PostInput
    const registerCursorPosition = useCallback((cursorPosition: number, valueLength?: number) => {
        const previousPosition = cursorPositionRef.current;

        const preservedPosition = preservedCursorPositionRef.current ?? lastCursorPositionBeforeEmojiPickerRef.current;
        const isInTransitionPeriod = isOpeningEmojiPickerRef.current || (showInputAccessoryView && lastCursorPositionBeforeEmojiPickerRef.current !== null);

        if (isInTransitionPeriod && preservedPosition !== null) {
            let isResettingToEnd = false;
            if (typeof valueLength === 'number') {
                isResettingToEnd = cursorPosition === valueLength && cursorPosition !== preservedPosition;
            } else {
                isResettingToEnd = cursorPosition !== preservedPosition &&
                    previousPosition !== cursorPosition &&
                    cursorPosition > preservedPosition &&
                    (previousPosition === preservedPosition || previousPosition < preservedPosition);
            }

            if (isResettingToEnd) {
                cursorPositionRef.current = preservedPosition;
                return;
            }
        }

        cursorPositionRef.current = cursorPosition;
    }, [showInputAccessoryView]);

    // Refs to store PostInput callbacks
    const updateValueRef = useRef<React.Dispatch<React.SetStateAction<string>> | null>(null);
    const updateCursorPositionRef = useRef<React.Dispatch<React.SetStateAction<number>> | null>(null);

    // Function to check if we're in emoji picker transition period
    const isInEmojiPickerTransition = useCallback(() => {
        return isOpeningEmojiPickerRef.current || (showInputAccessoryView && lastCursorPositionBeforeEmojiPickerRef.current !== null);
    }, [showInputAccessoryView]);

    // Function to get preserved cursor position if in transition
    const getPreservedCursorPosition = useCallback(() => {
        return preservedCursorPositionRef.current ?? lastCursorPositionBeforeEmojiPickerRef.current;
    }, []);

    // Function to clear preservation flags after emoji is inserted
    const clearCursorPositionPreservation = useCallback(() => {
        preservedCursorPositionRef.current = null;
        lastCursorPositionBeforeEmojiPickerRef.current = null;
    }, []);

    // Function to register PostInput callbacks
    const registerPostInputCallbacks = useCallback((
        updateValueFn: React.Dispatch<React.SetStateAction<string>>,
        updateCursorPositionFn: React.Dispatch<React.SetStateAction<number>>,
    ) => {
        updateValueRef.current = updateValueFn;
        updateCursorPositionRef.current = updateCursorPositionFn;

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
    const performScrollAdjustment = useCallback((targetOffset: number) => {
        listRef.current?.scrollToOffset({
            offset: targetOffset,
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
            const emojiPickerTopEdge = effectiveWindowHeight - postInputContainerHeight - currentEmojiPickerHeight;
            const emojiPickerBottomEdge = effectiveWindowHeight - postInputContainerHeight;

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

        const distanceFromBottom = effectiveWindowHeight - fingerY;

        // Subtract input container height to get emoji picker height
        const emojiPickerHeight = distanceFromBottom - postInputContainerHeight;
        const maxHeight = originalEmojiPickerHeightRef.current;
        const clampedHeight = emojiPickerHeight < 0 ? 0 : Math.min(emojiPickerHeight, maxHeight);

        inputAccessoryViewAnimatedHeight.value = clampedHeight;
        bottomInset.value = clampedHeight;
        lastDistanceFromBottomRef.current = clampedHeight;
        lastIsSwipingDownRef.current = previousTouchYRef.current !== null && fingerY > previousTouchYRef.current;
        previousTouchYRef.current = fingerY;
    }, [showInputAccessoryView, postInputContainerHeight, inputAccessoryViewAnimatedHeight, bottomInset, effectiveWindowHeight]);

    // Callback to dismiss emoji picker after animation completes
    const dismissEmojiPicker = useCallback(() => {
        // Reset emoji search focus when dismissing emoji picker
        setIsEmojiSearchFocused(false);
        setShowInputAccessoryView(false);
        isInputAccessoryViewMode.value = false;
        bottomInset.value = 0;
        scrollOffset.value = 0;
        keyboardHeight.value = 0;
    }, [setShowInputAccessoryView, isInputAccessoryViewMode, bottomInset, scrollOffset, keyboardHeight, setIsEmojiSearchFocused]);

    const closeInputAccessoryView = useCallback(() => {
        // Reset emoji search focus when closing emoji picker
        setIsEmojiSearchFocused(false);
        setShowInputAccessoryView(false);
        isInputAccessoryViewMode.value = false;
        isTransitioningFromCustomView.value = false;

        inputAccessoryViewAnimatedHeight.value = withTiming(0, {duration: 200});
        bottomInset.value = withTiming(0, {duration: 200});
        scrollOffset.value = withTiming(0, {duration: 200});
        keyboardHeight.value = 0;
    }, [inputAccessoryViewAnimatedHeight, bottomInset, scrollOffset, keyboardHeight, setShowInputAccessoryView, isInputAccessoryViewMode, isTransitioningFromCustomView, setIsEmojiSearchFocused]);

    const scrollToEnd = useCallback(() => {
        const activeHeight = Math.max(keyboardHeight.value, inputAccessoryViewAnimatedHeight.value);
        const targetOffset = -activeHeight;

        listRef.current?.scrollToOffset({offset: targetOffset, animated: true});
    }, [listRef, keyboardHeight, inputAccessoryViewAnimatedHeight]);

    useEffect(() => {
        if (Platform.OS !== 'android') {
            return undefined;
        }

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showInputAccessoryView) {
                closeInputAccessoryView();
                return true;
            }

            return false;
        });

        return () => backHandler.remove();
    }, [showInputAccessoryView, closeInputAccessoryView]);

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
            const currentScrollValue = scrollPosition.value;

            if (lastIsSwipingDownRef.current) {
                // User was swiping DOWN → Collapse and dismiss emoji picker
                // Calculate scroll positions: as bottomInset decreases from current to 0,
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
                bottomInset.value = withTiming(0, {duration: 250});

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

                // Calculate scroll positions: as bottomInset increases from current to targetHeight,
                // list should scroll from current position to final position
                const startScrollOffset = -currentInsetHeight + currentScrollValue;
                const endScrollOffset = -targetHeight + currentScrollValue;

                inputAccessoryViewAnimatedHeight.value = withTiming(targetHeight, {duration: 250});
                bottomInset.value = withTiming(targetHeight, {duration: 250});

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
    }, [inputAccessoryViewAnimatedHeight, dismissEmojiPicker, bottomInset, scrollPosition, animatedScrollAdjustment]);

    useLayoutEffect(() => {
        if (showInputAccessoryView && Platform.OS === 'ios') {
            keyboardHeight.value = 0;
        }
    }, [showInputAccessoryView, keyboardHeight]);

    // After emoji picker renders, adjust heights and scroll to keep messages visible
    useEffect(() => {
        if (showInputAccessoryView) {
            isOpeningEmojiPickerRef.current = false;

            // Wait one frame to ensure emoji picker has rendered
            requestAnimationFrame(() => {
                const emojiPickerHeight = inputAccessoryViewAnimatedHeight.value;
                const currentScroll = scrollPosition.value;

                originalScrollBeforeEmojiPicker.value = currentScroll;
                originalEmojiPickerHeightRef.current = emojiPickerHeight;

                // For inverted list: when bottomInset increases, content shifts UP visually. Scroll UP to compensate.
                const targetContentOffset = currentScroll - emojiPickerHeight;

                bottomInset.value = emojiPickerHeight;
                scrollOffset.value = emojiPickerHeight;

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
    }, [listRef]);

    // Android: Watch for emoji picker closing and restore scroll position when both height and bottomInset reach 0
    const isAndroid = Platform.OS === 'android';
    useAnimatedReaction(
        () => ({
            height: inputAccessoryViewAnimatedHeight.value,
            bottomInset: bottomInset.value,
        }),
        (current, previous) => {
            if (!isAndroid) {
                return;
            }

            // When emoji picker closes: height goes to 0 AND bottomInset reaches 0. Check previous.bottomInset > 0 because bottomInset affects scroll.
            const shouldRestoreScroll = previous !== null &&
                previous.bottomInset !== undefined &&
                previous.bottomInset > 0 &&
                current.height === 0 &&
                current.bottomInset === 0 &&
                !hasRestoredScrollForEmojiPicker.value;

            if (shouldRestoreScroll) {
                hasRestoredScrollForEmojiPicker.value = true;
                const currentScroll = scrollPosition.value;
                const emojiPickerHeight = previous.bottomInset;

                runOnJS(restoreScrollAfterEmojiPickerClose)(emojiPickerHeight, currentScroll);
            }
        },
        [inputAccessoryViewAnimatedHeight, bottomInset, scrollPosition, restoreScrollAfterEmojiPickerClose],
    );

    const keyboardAnimationValues = useMemo(() => ({
        keyboardTranslateY: keyboardCurrentHeight,
        bottomInset,
        scrollOffset,
        keyboardHeight,
        scrollPosition,
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
        preserveCursorPositionForEmojiPicker,
        clearCursorPositionPreservation,
        isInEmojiPickerTransition,
        getPreservedCursorPosition,
        updateValue: updateValueRef.current,
        updateCursorPosition: updateCursorPositionRef.current,
        registerPostInputCallbacks,
    }), [
        keyboardCurrentHeight,
        bottomInset,
        scrollOffset,
        keyboardHeight,
        scrollPosition,
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
        registerCursorPosition,
        preserveCursorPositionForEmojiPicker,
        clearCursorPositionPreservation,
        isInEmojiPickerTransition,
        getPreservedCursorPosition,
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
                    contentInset: bottomInset,
                    onScroll,
                    postInputContainerHeight,
                    onTouchMove: handleTouchMove,
                    onTouchEnd: handleTouchEnd,
                })}
            </View>
            <Animated.View
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
            </Animated.View>
        </>
    );

    return (
        <KeyboardAnimationProvider value={keyboardAnimationValues}>
            <Wrapper {...wrapperProps}>
                {content}
            </Wrapper>
        </KeyboardAnimationProvider>
    );
};

