// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

const {SERVER: {CHANNEL, SCHEDULED_POST}} = MM_TABLES;

export const queryScheduledPostsForTeam = (database: Database, teamId: string) => {
    return database.collections.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.on(CHANNEL,
            Q.and(
                Q.where('team_id', teamId),
                Q.where('type', 'O'),
            ),
        ),
        Q.sortBy('update_at', Q.desc),
    );
};
