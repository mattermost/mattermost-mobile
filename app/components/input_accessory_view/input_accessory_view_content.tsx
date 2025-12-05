// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {DeviceEventEmitter} from 'react-native';

import CustomEmojiPicker from '@components/post_draft/custom_emoji_picker/emoji_picker';
import {Events, Screens} from '@constants';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';

/**
 * InputAccessoryViewContent - Content for input accessory view
 */
const InputAccessoryViewContent = () => {
    const {inputAccessoryViewAnimatedHeight, isEmojiSearchFocused, setIsEmojiSearchFocused} = useKeyboardAnimationContext();

    const handleEmojiPress = useCallback((emoji: string) => {
        // Emit for both CHANNEL and THREAD - the listener will only process the matching one
        DeviceEventEmitter.emit(Events.SEND_TO_POST_DRAFT, {text: emoji, location: Screens.CHANNEL});
        DeviceEventEmitter.emit(Events.SEND_TO_POST_DRAFT, {text: emoji, location: Screens.THREAD});
    }, []);

    return (
        <CustomEmojiPicker
            onEmojiPress={handleEmojiPress}
            isEmojiSearchFocused={isEmojiSearchFocused}
            setIsEmojiSearchFocused={setIsEmojiSearchFocused}
            emojiPickerHeight={inputAccessoryViewAnimatedHeight}
            testID='input_accessory_emoji_picker'
        />
    );
};

export default InputAccessoryViewContent;

