// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {type StyleProp, View, type ViewStyle} from 'react-native';

import Emoji from '@components/emoji';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useEmojiSkinTone} from '@hooks/emoji_category_bar';
import {skinCodes} from '@utils/emoji';
import {isValidNamedEmoji} from '@utils/emoji/helpers';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    name: string;
    onEmojiPress: (emoji: string) => void;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

const SkinnedEmoji = ({name, onEmojiPress, size = 30, style}: Props) => {
    const skinTone = useEmojiSkinTone();
    const emojiName = useMemo(() => {
        const skinnedEmoji = `${name}_${skinCodes[skinTone]}`;
        if (skinTone === 'default' || !isValidNamedEmoji(skinnedEmoji, [])) {
            return name;
        }
        return skinnedEmoji;
    }, [name, skinTone]);

    const onPress = useCallback(preventDoubleTap(() => {
        onEmojiPress(emojiName);
    }), [emojiName]);

    return (
        <View
            style={style}
        >
            <TouchableWithFeedback
                hitSlop={hitSlop}
                onPress={onPress}
                style={style}
                type={'opacity'}
            >
                <Emoji
                    emojiName={emojiName}
                    size={size}
                />
            </TouchableWithFeedback>
        </View>
    );
};

export default React.memo(SkinnedEmoji);
