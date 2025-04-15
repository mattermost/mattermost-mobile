// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';

import {MM_TABLES} from '@constants/database';
import DraftModel from '@typings/database/models/servers/draft';

const {SERVER: {DRAFT, CHANNEL}} = MM_TABLES;

export const getDraft = async (database: Database, channelId: string, rootId = '') => {
    const record = await queryDraft(database, channelId, rootId).fetch();

    // Check done to force types
    if (record.length) {
        return record[0];
    }
    return undefined;
};

export const queryDraft = (database: Database, channelId: string, rootId = '') => {
    return database.collections.get<DraftModel>(DRAFT).query(
        Q.where('channel_id', channelId),
        Q.where('root_id', rootId),
    );
};

export function observeFirstDraft(v: DraftModel[]) {
    return v[0]?.observe() || of$(undefined);
}

export const queryDraftsForTeam = (database: Database, teamId: string) => {
    return database.collections.get<DraftModel>(DRAFT).query(
        Q.on(CHANNEL,
            Q.and(
                Q.or(
                    Q.where('team_id', teamId), // Channels associated with the given team
                    Q.where('type', 'D'), // Direct Message
                    Q.where('type', 'G'), // Group Message
                ),
                Q.where('delete_at', 0), // Ensure the channel is not deleted
            ),
        ),
        Q.sortBy('update_at', Q.desc),
    );
};

export const observeDraftsForTeam = (database: Database, teamId: string) => {
    return queryDraftsForTeam(database, teamId).observeWithColumns(['update_at']);
};

export const observeDraftCount = (database: Database, teamId: string) => {
    return queryDraftsForTeam(database, teamId).observeCount();
};
