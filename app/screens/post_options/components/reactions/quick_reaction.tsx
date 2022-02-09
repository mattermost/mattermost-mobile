// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import CompassIcon from '@components/compass_icon';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {EMOJI_PICKER} from '@constants/screens';
import {dismissModal, showModal} from '@screens/navigation';
import {safeParseJSON} from '@utils/helpers';

import PickReaction from './pick_reaction';
import Reaction from './reaction';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

type QuickReactionProps = {
    theme: Theme;
    recentEmojis: string[];
};

const DEFAULT_EMOJIS = [
    'thumbsup',
    'smiley',
    'white_check_mark',
    'heart',
    'eyes',
    'raised_hands',
];

const mergeRecentWithDefault = (recentEmojis: string[]) => {
    const filterUsed = DEFAULT_EMOJIS.filter((e) => !recentEmojis.includes(e));
    return recentEmojis.concat(filterUsed).splice(0, 6);
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

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    recentEmojis: database.
        get<SystemModel>(MM_TABLES.SERVER.SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.RECENT_REACTIONS).
        pipe(
            switchMap((recent) => of$(mergeRecentWithDefault(safeParseJSON(recent.value) as string[]))),
            catchError(() => of$(mergeRecentWithDefault([]))),
        ),
}));

export default withDatabase(enhanced(QuickReaction));
