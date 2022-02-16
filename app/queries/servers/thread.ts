// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q, Query} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {CHANNEL, POST, THREAD}} = MM_TABLES;

export const queryThreadsInTeam = (database: Database, teamId: string, onlyUnreads?: boolean, sort?: boolean, tab?: 'all' | 'unreads'): Query<ThreadModel> => {
    const query: Q.Clause[] = [
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
    if (tab) {
        if (tab === 'all') {
            query.push(Q.where('loaded_in_all_threads_tab', true));
        } else {
            query.push(Q.where('loaded_in_unreads_tab', true));
        }
    }
    if (sort) {
        query.push(Q.sortBy('last_reply_at', Q.desc));
    }
    return database.get<ThreadModel>(THREAD).query(...query);
};
