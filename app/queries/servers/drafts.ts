// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type DraftModel from '@typings/database/models/servers/draft';

const {SERVER: {DRAFT}} = MM_TABLES;

export const queryDraft = async (database: Database, channelId: string, rootId = '') => {
    try {
        const record = await database.collections.get<DraftModel>(DRAFT).query(
            Q.where('channel_id', channelId),
            Q.where('root_id', rootId),
        ).fetch();
        return record?.[0];
    } catch {
        return undefined;
    }
};
