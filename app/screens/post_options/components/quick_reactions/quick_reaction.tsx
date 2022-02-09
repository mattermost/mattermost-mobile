// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {EMOJI_PICKER} from '@constants/screens';
import {dismissModal, showModal} from '@screens/navigation';

import PickReaction from './pick_reaction';
import Reaction from './reaction';

type QuickReactionProps = {
    theme: Theme;
    recentEmojis: string[];
};

const QuickReaction = ({recentEmojis = [], theme}: QuickReactionProps) => {
    const intl = useIntl();

    const handleEmojiPress = useCallback((emoji: string) => {
        // eslint-disable-next-line no-console
        console.log('>>>  selected this emoji', emoji);
    }, []);

    const openEmojiPicker = useCallback(() => {
        dismissModal();
        const closeButton = CompassIcon.getImageSourceSync(
            'close',
            24,
            theme.sidebarHeaderTextColor,
        );

        const screen = EMOJI_PICKER;
        const title = intl.formatMessage({
            id: 'mobile.post_info.add_reaction',
            defaultMessage: 'Add Reaction',
        });
        const passProps = {
            closeButton,
            onEmojiPress: handleEmojiPress,
        };

        showModal(screen, title, passProps);
    }, [intl]);

    const getMostFrequentReactions = useCallback(() => {
        return recentEmojis.map((emojiName) => {
            return (
                <Reaction
                    key={`${emojiName}`}
                    onPressReaction={handleEmojiPress}
                    emoji={emojiName}
                />
            );
        });
    }, [recentEmojis, handleEmojiPress]);

    return (
        <View
            style={{
                height: 50,
                backgroundColor: theme.centerChannelBg,
                flexDirection: 'row',
            }}
        >
            { recentEmojis.length > 0 && (
                <View style={{flexDirection: 'row'}}>
                    {getMostFrequentReactions()}
                </View>
            )}
            <PickReaction
                openEmojiPicker={openEmojiPicker}
                theme={theme}
            />

        </View>
    );
};

export default QuickReaction;
