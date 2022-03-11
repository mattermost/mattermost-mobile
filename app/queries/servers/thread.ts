// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q, Query} from '@nozbe/watermelondb';

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

export const queryThreadsInTeam = (database: Database, teamId: string, onlyUnreads?: boolean, sort?: boolean): Query<ThreadModel> => {
    const query: Q.Clause[] = [
        Q.where('is_following', true),
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
    ];
    if (onlyUnreads) {
        query.push(Q.where('unread_replies', Q.gt(0)));
    }
    if (sort) {
        query.push(Q.sortBy('last_reply_at', Q.desc));
    }
    return database.get<ThreadModel>(THREAD).query(...query);
};
