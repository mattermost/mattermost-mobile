// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import Emoji from '@components/emoji';
import {useEmojiSkinTone} from '@hooks/emoji_category_bar';
import {skinCodes} from '@utils/emoji';
import {isValidNamedEmoji} from '@utils/emoji/helpers';

type Props = {
    name: string;
    size?: number;
}

const SkinnedEmoji = ({name, size = 30}: Props) => {
    const skinTone = useEmojiSkinTone();
    const emojiName = useMemo(() => {
        const skinnedEmoji = `${name}_${skinCodes[skinTone]}`;
        if (skinTone === 'default' || !isValidNamedEmoji(skinnedEmoji, [])) {
            return name;
        }
        return skinnedEmoji;
    }, [name, skinTone]);

    return (
        <Emoji
            emojiName={emojiName}
            size={size}
        />
    );
};

export default React.memo(SkinnedEmoji);
