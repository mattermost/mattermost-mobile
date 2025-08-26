// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

import {getConfigValue, getLicense, observeConfigBooleanValue, observeLicense} from './system';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
const {SERVER: {CHANNEL, SCHEDULED_POST}} = MM_TABLES;

export const queryScheduledPostsForTeam = (database: Database, teamId: string, includeDirectChannelPosts?: boolean) => {
    return database.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.on(CHANNEL,
            Q.or(
                Q.where('team_id', teamId),
                ...(includeDirectChannelPosts ? [
                    Q.where('team_id', ''), // Direct messages
                ] : []),
            ),
        ),
        Q.sortBy('scheduled_at', Q.asc),
    );
};

export const queryScheduledPost = (database: Database, channelId: string, rootId = '') => {
    return database.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.and(
            Q.where('channel_id', channelId),
            Q.where('root_id', rootId),
        ),
    );
};

export function observeFirstScheduledPost(v: ScheduledPostModel[]) {
    return v[0]?.observe() || of$(undefined);
}

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
        Q.and(
            Q.where('channel_id', channelId),
            Q.where('error_code', ''),
        ),
    );

    if (isCRTEnabled) {
        query = query.extend(Q.where('root_id', ''));
    }

    return query.observeCount();
};

export const observeScheduledPostCountForThread = (database: Database, rootId: string) => {
    return database.get<ScheduledPostModel>(SCHEDULED_POST).query(
        Q.where('root_id', rootId),
    ).observeCount();
};

export const observeScheduledPostEnabled = (database: Database) => {
    const isScheduledPostConfigEnabled = observeConfigBooleanValue(database, 'ScheduledPosts');
    const isLicensed = observeLicense(database);

    const isScheduledPostEnabled = combineLatest([isScheduledPostConfigEnabled, isLicensed]).pipe(
        switchMap(([isEnabled, license]) => {
            if (license?.IsLicensed === 'true') {
                return of$(isEnabled);
            }
            return of$(false);
        }),
        distinctUntilChanged(),
    );

    return isScheduledPostEnabled;
};

export const getIsScheduledPostEnabled = async (database: Database) => {
    return (await getConfigValue(database, 'ScheduledPosts')) === 'true' && (await getLicense(database))?.IsLicensed === 'true';
};
