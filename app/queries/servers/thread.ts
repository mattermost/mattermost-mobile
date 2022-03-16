// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q, Query} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {processIsCRTEnabled} from '@helpers/api/preference';

import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {CHANNEL, POST, PREFERENCE, SYSTEM, THREAD}} = MM_TABLES;

export async function getIsCRTEnabled(database: Database): Promise<boolean> {
    const {value: config} = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CONFIG);
    const preferences = await database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).fetch();
    return processIsCRTEnabled(preferences, config);
}

type QueryThreadsInTeamArgs = {
    database: Database;
    hasReplies?: boolean;
    isFollowing?: boolean;
    onlyUnreads?: boolean;
    sort?: boolean;
    teamId?: string;
};
export const queryThreadsInTeam = ({database, hasReplies = true, isFollowing = true, onlyUnreads, sort, teamId}: QueryThreadsInTeamArgs): Query<ThreadModel> => {
    const query: Q.Clause[] = [];

    if (isFollowing) {
        query.push(Q.where('is_following', true));
    }

    // Posts can be followed even without replies, they shouldn't be displayed in global threads
    if (hasReplies) {
        query.push(Q.where('reply_count', Q.gt(0)));
    }

    // If teamId is specified, only get threads in that team and DM
    if (teamId) {
        query.push(
            Q.experimentalNestedJoin(POST, CHANNEL),
            Q.on(
                POST,
                Q.on(
                    CHANNEL,
                    Q.or(
                        Q.where('team_id', teamId),
                        Q.where('team_id', ''),
                    ),
                ),
            ),
        );
    }

    if (onlyUnreads) {
        query.push(Q.where('unread_replies', Q.gt(0)));
    }

    if (sort) {
        query.push(Q.sortBy('last_reply_at', Q.desc));
    }

    return database.get<ThreadModel>(THREAD).query(...query);
};

export const queryUnreadsAndMentionsInTeam = (database: Database, teamId: string) => {
    return queryThreadsInTeam({database, teamId, onlyUnreads: true}).observeWithColumns(['unread_replies', 'unread_mentions']).pipe(
        switchMap((threads) => {
            let unreads = 0;
            let mentions = 0;
            threads.forEach((thread) => {
                unreads += thread.unreadReplies;
                mentions += thread.unreadMentions;
            });
            return of$({unreads, mentions});
        }),
    );
};
