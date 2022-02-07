// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {CHANNEL, POST, THREAD}} = MM_TABLES;

export const queryThreadsInTeam = (database: Database, teamId: string): Promise<ThreadModel[]> => {
    try {
        return database.get<ThreadModel>(THREAD).query(
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
        ).fetch() as Promise<ThreadModel[]>;
    } catch (e) {
        return Promise.resolve([] as ThreadModel[]);
    }
};
