// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {DeviceEventEmitter} from 'react-native';
import Animated, {Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {Events} from '@app/constants';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';

import EmojiPicker from './emoji_picker';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type {KeyboardTrackingViewRef} from 'libraries/@mattermost/keyboard-tracker/src';

type Props = {
    scrollViewNativeID: string | undefined;
    channelId: string;
    keyboardTracker: React.RefObject<KeyboardTrackingViewRef>;
    inputRef: React.MutableRefObject<PasteInputRef | undefined>;
    onEmojiPress: (emoji: string) => void;
    handleToggleEmojiPicker: () => void;
    deleteCharFromCurrentCursorPosition: () => void;
    setIsEmojiPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEmojiPickerFocused: React.Dispatch<React.SetStateAction<boolean>>;
}

const getStyleSheets = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 9,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
    };
});

const EMOJI_PICKER_HEIGHT = 300;

const CustomEmojiPicker: React.FC<Props> = ({
    scrollViewNativeID,
    channelId,
    keyboardTracker,
    inputRef,
    onEmojiPress,
    handleToggleEmojiPicker,
    deleteCharFromCurrentCursorPosition,
    setIsEmojiPickerOpen,
    setIsEmojiPickerFocused,
}) => {
    const theme = useTheme();
    const height = useSharedValue(EMOJI_PICKER_HEIGHT);
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = React.useState(false);

    const styles = getStyleSheets(theme);

    useEffect(() => {
        const closeEmojiPicker = DeviceEventEmitter.addListener(Events.CLOSE_EMOJI_PICKER, () => {
            keyboardTracker.current?.resumeTracking(scrollViewNativeID || channelId);
            inputRef.current?.setNativeProps({
                showSoftInputOnFocus: true,
            });
            height.value = withTiming(0, {
                duration: 0,
                easing: Easing.inOut(Easing.ease),
                // eslint-disable-next-line max-nested-callbacks
            }, (finished) => {
                if (finished) {
                    runOnJS(setIsEmojiPickerOpen)(false);
                    runOnJS(setIsEmojiPickerFocused)(false);
                }
            });
        });

        return () => {
            closeEmojiPicker.remove();
        };
    }, []);

    useEffect(() => {
        if (isEmojiSearchFocused) {
            height.value = withTiming(400, {duration: 0});
            return;
        }
        keyboardTracker.current?.pauseTracking(scrollViewNativeID || channelId);
        height.value = withTiming(EMOJI_PICKER_HEIGHT, {duration: 0});
    }, [isEmojiSearchFocused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: height.value,
        };
    });

    const handleEmojiPress = (emoji: string) => {
        onEmojiPress(emoji);
    };
    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <EmojiPicker
                onEmojiPress={handleEmojiPress}
                testID='custom_emoji_picker'
                handleToggleEmojiPicker={handleToggleEmojiPicker}
                deleteCharFromCurrentCursorPosition={deleteCharFromCurrentCursorPosition}
                setIsEmojiSearchFocused={setIsEmojiSearchFocused}
                isEmojiSearchFocused={isEmojiSearchFocused}
            />
        </Animated.View>);
};

export default CustomEmojiPicker;
