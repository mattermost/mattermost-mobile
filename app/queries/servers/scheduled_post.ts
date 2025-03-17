// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

const {SERVER: {CHANNEL, SCHEDULED_POST}} = MM_TABLES;

export const queryScheduledPostsForTeam = (database: Database, teamId: string, includeDirectChannelPosts?: boolean) => {
    return database.collections.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.on(CHANNEL,
            Q.or(
                Q.where('team_id', teamId),
                ...(includeDirectChannelPosts ? [
                    Q.where('team_id', ''), // Direct messages
                ] : []),
            ),
        ),
        Q.sortBy('update_at', Q.desc),
    );
};

export const observeScheduledPostsForTeam = (database: Database, teamId: string, includeDirectChannelPosts?: boolean) => {
    return queryScheduledPostsForTeam(database, teamId, includeDirectChannelPosts).observeWithColumns(['update_at', 'error_code']);
};

export const observeScheduledPostCount = (database: Database, teamId: string, includeDirectChannelPosts?: boolean) => {
    return queryScheduledPostsForTeam(database, teamId, includeDirectChannelPosts).observeCount();
};

export const observeScheduledPostCountForChannel = (
    database: Database,
    channelId: string,
    isCRTEnabled: boolean,
) => {
    let query = database.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.on(CHANNEL,
            Q.where('id', channelId),
        ),
    );

    if (isCRTEnabled) {
        query = query.extend(Q.where('root_id', ''));
    }

    return query.observeCount();
};

export const observeScheduledPostCountForThread = (database: Database, rootId: string) => {
    return database.collections.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.where('root_id', rootId),
    ).observeCount();
};
