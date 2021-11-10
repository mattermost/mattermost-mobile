// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {OperationType} from '@typings/database/enums';

import type {TransformerArgs} from '@typings/database/database';
import type RecentMentionsModel from '@typings/database/models/servers/recent_mentions';

const {RECENT_MENTIONS} = MM_TABLES.SERVER;
export const transformRecentMentionsRecord = ({action, database, value}: TransformerArgs): Promise<RecentMentionsModel> => {
    const raw = value.raw as RecentMentions;
    const record = value.record as RecentMentionsModel;

    const isCreateAction = action === OperationType.CREATE;

    // id of reaction comes from server response
    const fieldsMapper = (recentMention: RecentMentionsModel) => {
        recentMention._raw.id = isCreateAction ? (raw?.post_id ?? recentMention.postId) : record.postId;
        recentMention.postId = raw.post_id;
        recentMention.updateAt = raw.update_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: RECENT_MENTIONS,
        value,
        fieldsMapper,
    }) as Promise<RecentMentionsModel>;
};
