// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            height: 50,
            width: 50,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            alignItems: 'center',
            justifyContent: 'center',
        },
        icon: {
            ...typography('Body', 1000),
            color: theme.centerChannelColor,
        },
    };
});

type PickReactionProps = {
    openEmojiPicker: () => void;
    theme: Theme;
}
const PickReaction = ({openEmojiPicker, theme}: PickReactionProps) => {
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.container}>
            <CompassIcon
                onPress={openEmojiPicker}
                name='emoticon-plus-outline'
                style={styles.icon}
            />
        </View>
    );
};

export default PickReaction;
