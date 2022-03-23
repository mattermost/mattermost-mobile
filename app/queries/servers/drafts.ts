// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type DraftModel from '@typings/database/models/servers/draft';

const {SERVER: {DRAFT}} = MM_TABLES;

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
