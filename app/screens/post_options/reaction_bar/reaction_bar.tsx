// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {useWindowDimensions, View} from 'react-native';

import {addReaction} from '@actions/remote/reactions';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {
    LARGE_CONTAINER_SIZE,
    LARGE_ICON_SIZE,
    REACTION_PICKER_HEIGHT,
    SMALL_CONTAINER_SIZE,
    SMALL_ICON_BREAKPOINT,
    SMALL_ICON_SIZE,
} from '@constants/reaction_picker';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, showModal} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import PickReaction from './pick_reaction';
import Reaction from './reaction';

type QuickReactionProps = {
    recentEmojis: string[];
    postId: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            alignItems: 'center',
            height: REACTION_PICKER_HEIGHT,
            justifyContent: 'space-between',
        },
    };
});

const ReactionBar = ({recentEmojis = [], postId}: QuickReactionProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const {width} = useWindowDimensions();
    const serverUrl = useServerUrl();
    const isSmallDevice = width < SMALL_ICON_BREAKPOINT;
    const styles = getStyleSheet(theme);

    const handleEmojiPress = useCallback(async (emoji: string) => {
        await dismissBottomSheet(Screens.POST_OPTIONS);
        addReaction(serverUrl, postId, emoji);
    }, [postId, serverUrl]);

    const openEmojiPicker = useCallback(async () => {
        await dismissBottomSheet(Screens.POST_OPTIONS);

        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const screen = Screens.EMOJI_PICKER;
        const title = intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});
        const passProps = {closeButton, onEmojiPress: handleEmojiPress};

        showModal(screen, title, passProps);
    }, [intl, theme]);

    let containerSize = LARGE_CONTAINER_SIZE;
    let iconSize = LARGE_ICON_SIZE;

    if (isSmallDevice) {
        containerSize = SMALL_CONTAINER_SIZE;
        iconSize = SMALL_ICON_SIZE;
    }

    return (
        <View style={styles.container}>
            {
                recentEmojis.map((emoji) => {
                    return (
                        <Reaction
                            key={emoji}
                            onPressReaction={handleEmojiPress}
                            emoji={emoji}
                            iconSize={iconSize}
                            containerSize={containerSize}
                            testID='post_options.reaction_bar.reaction'
                        />
                    );
                })
            }
            <PickReaction
                openEmojiPicker={openEmojiPicker}
                width={containerSize}
                height={containerSize}
            />
        </View>
    );
};

export default ReactionBar;
