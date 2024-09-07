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

type Props = {
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

const EMOJI_PICKER_HEIGHT = 301;

const CustomEmojiPicker: React.FC<Props> = ({
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
            inputRef.current?.setNativeProps({
                showSoftInputOnFocus: true,
            });
            height.value = withTiming(0, {
                duration: 0,
                easing: Easing.linear,
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
                emojiPickerHeight={height}
            />
        </Animated.View>);
};

export default CustomEmojiPicker;
