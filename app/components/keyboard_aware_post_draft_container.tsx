// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, type ReactNode} from 'react';
import {type StyleProp, StyleSheet, type ViewStyle, View, type LayoutChangeEvent} from 'react-native';
import {KeyboardGestureArea} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import {KeyboardAnimationProvider} from '@context/keyboard_animation';
import {useKeyboardAwarePostDraft} from '@hooks/useKeyboardAwarePostDraft';

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
        contentInset,
        onScroll,
        postInputContainerHeight,
        setPostInputContainerHeight,
        inputContainerAnimatedStyle,
        keyboardHeight,
        offset,
        scroll,
    } = useKeyboardAwarePostDraft();

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setPostInputContainerHeight(e.nativeEvent.layout.height);
    }, [setPostInputContainerHeight]);

    // Prepare context value with all keyboard animation values
    const keyboardAnimationValue = {
        height: keyboardCurrentHeight,
        inset: contentInset,
        offset,
        keyboardHeight,
        scroll,
        onScroll,
        postInputContainerHeight,
    };

    return (
        <KeyboardAnimationProvider value={keyboardAnimationValue}>
            <KeyboardGestureArea
                textInputNativeID={textInputNativeID}
                offset={postInputContainerHeight}
                style={styles.gestureArea}
            >
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
            </KeyboardGestureArea>
        </KeyboardAnimationProvider>
    );
};

