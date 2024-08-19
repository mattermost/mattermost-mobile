// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import EmojiPicker from './emoji_picker';

type Props = {
    onEmojiPress: (emoji: string) => void;
}

const CustomEmojiPicker: React.FC<Props> = ({
    onEmojiPress,
}) => {
    const handleEmojiPress = React.useCallback((emoji: string) => {
        onEmojiPress(emoji);
    }, []);
    return (
        <View style={{height: 300, padding: 8}}>
            <EmojiPicker
                onEmojiPress={handleEmojiPress}
                testID='custom_emoji_picker'
            />
        </View>);
};

export default CustomEmojiPicker;
