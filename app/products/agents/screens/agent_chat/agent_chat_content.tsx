// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Platform, StyleSheet} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {scrollTo, useAnimatedProps, useAnimatedReaction, useAnimatedStyle} from 'react-native-reanimated';
import {scheduleOnUI} from 'react-native-worklets';

import {useKeyboardState} from '@context/keyboard_state';
import useDidMount from '@hooks/did_mount';
import {useInputAccessoryViewGesture} from '@hooks/use_input_accessory_view_gesture';

import AgentChatIntro from './agent_chat_intro';

type Props = {
    loading: boolean;
    error: string | null;
}

const emptyList: string[] = [];
const renderItem = () => null;

const isAndroid = Platform.OS === 'android';

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const AgentChatContent = ({error, loading}: Props) => {
    const {stateContext, onScroll: onScrollProp, postInputContainerHeight, isEmojiSearchFocused, listRef} = useKeyboardState();

    const {
        scrollOffset: scrollOffsetShared,
        scrollPosition: scrollPositionShared,
        postInputTranslateY,
    } = stateContext;

    useAnimatedReaction(
        () => ({
            scrollOffset: scrollOffsetShared.value,
            scrollPosition: scrollPositionShared.value,
            isReconcilerPaused: stateContext.isReconcilerPaused.value,
        }),
        (current, previous) => {
            'worklet';

            // Skip scroll compensation if reconciler is paused
            // This allows exit actions to manually adjust scrollPosition without interference
            if (current.isReconcilerPaused || !listRef) {
                return;
            }

            // Trigger scroll compensation if EITHER scrollOffset or scrollPosition changed
            // This ensures we continuously adjust scroll as contentInset changes during keyboard animation
            const offsetChanged = previous === null || Math.abs(current.scrollOffset - (previous?.scrollOffset || 0)) > 0.5;

            if (!offsetChanged) {
                return;
            }
            scrollTo(listRef, 0, -current.scrollOffset + current.scrollPosition, false);
        },
        [],
    );

    const scrollToEnd = useCallback(() => {
        if (listRef) {
            scheduleOnUI(() => {
                scrollTo(listRef, 0, -postInputTranslateY.value, true);
            });
        }

    // postInputTranslateY is a stable shared value ref — .value is read on the UI thread inside scheduleOnUI
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listRef]);

    useDidMount(() => {
        const t = setTimeout(() => {
            scrollToEnd();
        }, 300);

        return () => clearTimeout(t);
    });

    const contentContainerStyleWithPadding = useMemo(() => {
        return {paddingTop: postInputContainerHeight};
    }, [postInputContainerHeight]);

    const animatedProps = useAnimatedProps(
        () => {
            return {
                contentInset: {
                    top: Math.max(postInputTranslateY.value, 0),
                },
            };
        },
        [],
    );

    const androidExtra = useAnimatedStyle(() => {
        if (isAndroid) {
            return {
                marginBottom: Math.max(postInputTranslateY.value, 0),
            };
        }
        return {};
    }, []);

    const {panGesture: emojiPickerGesture} = useInputAccessoryViewGesture();

    const nativeGesture = Gesture.Native();
    const composedGesture = useMemo(() => {
        if (emojiPickerGesture) {
            return Gesture.Simultaneous(nativeGesture, emojiPickerGesture);
        }
        return nativeGesture;

        // nativeGesture is stable — created once outside this memo
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [emojiPickerGesture]);

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.FlatList
                animatedProps={animatedProps}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior='never'
                contentContainerStyle={contentContainerStyleWithPadding}
                data={emptyList}
                keyboardDismissMode={isEmojiSearchFocused ? 'none' : 'interactive'}
                keyboardShouldPersistTaps='handled'
                ListHeaderComponent={
                    <AgentChatIntro
                        loading={loading}
                        error={error}
                    />
                }
                onScroll={onScrollProp}
                ref={listRef}
                removeClippedSubviews={true}
                renderItem={renderItem}
                style={[styles.flex, androidExtra]}
                inverted={true}
            />
        </GestureDetector>
    );
};

export default AgentChatContent;

