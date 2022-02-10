// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import ReactionBar from './reaction_bar';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

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

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    recentEmojis: database.
        get<SystemModel>(MM_TABLES.SERVER.SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.RECENT_REACTIONS).
        pipe(
            switchMap((recent) => of$(mergeRecentWithDefault(safeParseJSON(recent.value) as string[]))),
            catchError(() => of$(mergeRecentWithDefault([]))),
        ),
}));

export default withDatabase(enhanced(ReactionBar));
