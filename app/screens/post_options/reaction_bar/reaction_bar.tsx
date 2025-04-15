// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {useWindowDimensions, View} from 'react-native';

import {toggleReaction} from '@actions/remote/reactions';
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
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import PickReaction from './pick_reaction';
import Reaction from './reaction';

import type {AvailableScreens} from '@typings/screens/navigation';

type QuickReactionProps = {
    bottomSheetId: AvailableScreens;
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
            marginBottom: 8,
        },
    };
});

const ReactionBar = ({bottomSheetId, recentEmojis = [], postId}: QuickReactionProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const {width} = useWindowDimensions();
    const serverUrl = useServerUrl();
    const isSmallDevice = width < SMALL_ICON_BREAKPOINT;
    const styles = getStyleSheet(theme);

    const isTablet = useIsTablet();

    const handleEmojiPress = useCallback(async (emoji: string) => {
        await dismissBottomSheet(bottomSheetId);
        toggleReaction(serverUrl, postId, emoji);
    }, [bottomSheetId, postId, serverUrl]);

    const openEmojiPicker = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        openAsBottomSheet({
            closeButtonId: 'close-add-reaction',
            screen: Screens.EMOJI_PICKER,
            theme,
            title: intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
            props: {onEmojiPress: handleEmojiPress},
        });
    }, [bottomSheetId, handleEmojiPress, intl, theme]);

    let containerSize = LARGE_CONTAINER_SIZE;
    let iconSize = LARGE_ICON_SIZE;

    if (isSmallDevice) {
        containerSize = SMALL_CONTAINER_SIZE;
        iconSize = SMALL_ICON_SIZE;
    }

    return (
        <View style={[styles.container, {marginTop: isTablet ? 12 : 0}]}>
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
