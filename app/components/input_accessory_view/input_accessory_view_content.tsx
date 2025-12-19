// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomEmojiPicker from '@components/post_draft/custom_emoji_picker';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';

/**
 * InputAccessoryViewContent - Content for input accessory view
 */
const InputAccessoryViewContent = () => {
    const {inputAccessoryViewAnimatedHeight, isEmojiSearchFocused, setIsEmojiSearchFocused} = useKeyboardAnimationContext();

    return (
        <CustomEmojiPicker
            height={inputAccessoryViewAnimatedHeight}
            isEmojiSearchFocused={isEmojiSearchFocused}
            setIsEmojiSearchFocused={setIsEmojiSearchFocused}
        />
    );
};

export default InputAccessoryViewContent;

