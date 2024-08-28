// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {DeviceEventEmitter} from 'react-native';
import Animated, {Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {Events} from '@app/constants';

import EmojiPicker from './emoji_picker';

import type {KeyboardTrackingViewRef} from 'libraries/@mattermost/keyboard-tracker/src';

type Props = {
    onEmojiPress: (emoji: string) => void;
    focus?: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
    setIsEmojiPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    keyboardTracker: React.RefObject<KeyboardTrackingViewRef>;
    channelId: string;
}

const EMOJI_PICKER_HEIGHT = 300;

const CustomEmojiPicker: React.FC<Props> = ({
    onEmojiPress,
    focus,
    deleteCharFromCurrentCursorPosition,
    setIsEmojiPickerOpen,
    keyboardTracker,
    channelId,
}) => {
    const height = useSharedValue(EMOJI_PICKER_HEIGHT);
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = React.useState(false);

    useEffect(() => {
        const closeEmojiPicker = DeviceEventEmitter.addListener(Events.CLOSE_EMOJI_PICKER, () => {
            height.value = withTiming(0, {
                duration: 100,
                easing: Easing.inOut(Easing.ease),
            // eslint-disable-next-line max-nested-callbacks
            }, (finished) => {
                if (finished) {
                    runOnJS(setIsEmojiPickerOpen)(false);
                }
            });
        });

        return () => {
            closeEmojiPicker.remove();
        };
    }, []);

    useEffect(() => {
        if (isEmojiSearchFocused) {
            height.value = withTiming(100, {duration: 0});
            keyboardTracker.current?.resumeTracking(channelId);
        } else {
            height.value = withTiming(EMOJI_PICKER_HEIGHT, {duration: 0});
            keyboardTracker.current?.pauseTracking(channelId);
        }
    }, [isEmojiSearchFocused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: height.value, // Bind the derived height value
        };
    });

    const handleEmojiPress = (emoji: string) => {
        onEmojiPress(emoji);
    };
    return (
        <Animated.View style={[animatedStyle]}>
            <EmojiPicker
                onEmojiPress={handleEmojiPress}
                testID='custom_emoji_picker'
                focus={focus}
                deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
                setIsEmojiSearchFocused={setIsEmojiSearchFocused}
                isEmojiSearchFocused={isEmojiSearchFocused}
            />
        </Animated.View>);
};

export default CustomEmojiPicker;
