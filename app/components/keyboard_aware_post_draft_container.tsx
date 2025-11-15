// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {Platform, type StyleProp, StyleSheet, type ViewStyle, View, type LayoutChangeEvent} from 'react-native';
import {KeyboardGestureArea} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import {KeyboardAnimationProvider} from '@context/keyboard_animation';
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
    } = useKeyboardAwarePostDraft();

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setPostInputContainerHeight(e.nativeEvent.layout.height);
    }, [setPostInputContainerHeight]);

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
    }), [
        keyboardCurrentHeight,
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
                onLayout={onLayout}
            >
                {children}
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

