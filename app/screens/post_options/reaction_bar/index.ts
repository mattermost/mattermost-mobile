// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeRecentReactions} from '@queries/servers/system';
import {getEmojiFirstAlias} from '@utils/emoji/helpers';

import ReactionBar from './reaction_bar';

import type {WithDatabaseArgs} from '@typings/database/database';

const DEFAULT_EMOJIS = [
    '+1',
    'smiley',
    'white_check_mark',
    'heart',
    'eyes',
    'raised_hands',
];

const mergeRecentWithDefault = (recentEmojis: string[]) => {
    const emojiAliases = recentEmojis.slice(0, 6).map((emoji) => getEmojiFirstAlias(emoji));
    const emojisSet = new Set(emojiAliases);
    const filterUsed = DEFAULT_EMOJIS.filter((e) => !emojisSet.has(e));
    return emojiAliases.concat(filterUsed).splice(0, 6);
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    recentEmojis: observeRecentReactions(database).
        pipe(
            switchMap((recent) => of$(mergeRecentWithDefault(recent))),
        ),
}));

export default withDatabase(enhanced(ReactionBar));
