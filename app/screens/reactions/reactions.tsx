// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {getEmojiFirstAlias} from '@utils/emoji/helpers';

import EmojiAliases from './emoji_aliases';
import EmojiBar from './emoji_bar';
import ReactorsList from './reactors_list';

import type ReactionModel from '@typings/database/models/servers/reaction';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    initialEmoji: string;
    location: AvailableScreens;
    reactions?: ReactionModel[];
}

const Reactions = ({initialEmoji, location, reactions}: Props) => {
    const isTablet = useIsTablet();
    const [sortedReactions, setSortedReactions] = useState(Array.from(new Set(reactions?.map((r) => getEmojiFirstAlias(r.emojiName)))));
    const [index, setIndex] = useState(sortedReactions.indexOf(initialEmoji));

    const reactionsByName = useMemo(() => {
        return reactions?.reduce((acc, reaction) => {
            const emojiAlias = getEmojiFirstAlias(reaction.emojiName);
            if (acc.has(emojiAlias)) {
                const rs = acc.get(emojiAlias);
                // eslint-disable-next-line max-nested-callbacks
                const present = rs!.findIndex((r) => r.userId === reaction.userId) > -1;
                if (!present) {
                    rs!.push(reaction);
                }
            } else {
                acc.set(emojiAlias, [reaction]);
            }

            return acc;
        }, new Map<string, ReactionModel[]>());
    }, [reactions]);

    const renderContent = useCallback(() => {
        const emojiAlias = sortedReactions[index];
        if (!reactionsByName) {
            return null;
        }

        return (
            <>
                <EmojiBar
                    emojiSelected={emojiAlias}
                    reactionsByName={reactionsByName}
                    setIndex={setIndex}
                    sortedReactions={sortedReactions}
                />
                <EmojiAliases emoji={emojiAlias}/>
                <ReactorsList
                    key={emojiAlias}
                    location={location}
                    reactions={reactionsByName.get(emojiAlias)!}
                    type={isTablet ? 'FlatList' : 'BottomSheetFlatList'}
                />
            </>
        );
    }, [index, location, reactions, sortedReactions]);

    useEffect(() => {
        // This helps keep the reactions in the same position at all times until unmounted
        const rs = reactions?.map((r) => getEmojiFirstAlias(r.emojiName));
        const sorted = new Set([...sortedReactions]);
        const added = rs?.filter((r) => !sorted.has(r));
        added?.forEach(sorted.add, sorted);
        const removed = [...sorted].filter((s) => !rs?.includes(s));
        removed.forEach(sorted.delete, sorted);
        setSortedReactions(Array.from(sorted));
    }, [reactions]);

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-post-reactions'
            componentId={Screens.REACTIONS}
            initialSnapIndex={1}
            snapPoints={[1, '50%', '80%']}
            testID='reactions'
        />
    );
};

export default Reactions;
