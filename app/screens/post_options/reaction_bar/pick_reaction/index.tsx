// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Pressable, type PressableStateCallbackType, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {LARGE_ICON_SIZE} from '@constants/reaction_picker';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
        },
        highlight: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        icon: {
            fontSize: LARGE_ICON_SIZE,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
    };
});

type PickReactionProps = {
    openEmojiPicker: () => void;
    width: number;
    height: number;
}
const PickReaction = ({openEmojiPicker, width, height}: PickReactionProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const highlightedStyle = useCallback(({pressed}: PressableStateCallbackType) => (pressed ? styles.highlight : undefined), [styles.highlight]);
    const pickReactionStyle = useMemo(() => [
        styles.container,
        {
            width,
            height,
        },
    ], [width, height]);

    return (
        <Pressable
            onPress={openEmojiPicker}
            style={highlightedStyle}
        >
            <View
                style={pickReactionStyle}
                testID='post_options.reaction_bar.pick_reaction.button'
            >
                <CompassIcon
                    name='emoticon-plus-outline'
                    style={styles.icon}
                />
            </View>
        </Pressable>
    );
};

export default PickReaction;
