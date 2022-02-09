// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import Emoji from '@components/emoji_picker/sections/touchable_emoji';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            height: 50,
            width: 50,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

type ReactionProps = {
    onPressReaction: (emoji: string) => void;
    emoji: string;
}
const Reaction = ({onPressReaction, emoji}: ReactionProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const handleReactionPressed = useCallback(() => {
        onPressReaction(emoji);
    }, [onPressReaction]);

    return (
        <Emoji
            style={styles.container}
            name={emoji}
            size={32}
            onEmojiPress={handleReactionPressed}
        />
    );
};

export default Reaction;
