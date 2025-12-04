// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {TransformerArgs} from '@typings/database/database';
import type ReactionModel from '@typings/database/models/servers/reaction';

const {REACTION} = MM_TABLES.SERVER;

/**
 * transformReactionRecord: Prepares a record of the SERVER database 'Reaction' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ReactionModel>}
 */
export const transformReactionRecord = ({action, database, value}: TransformerArgs<ReactionModel, Reaction>): Promise<ReactionModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // id of reaction comes from server response
    const fieldsMapper = (reaction: ReactionModel) => {
        reaction._raw.id = isCreateAction ? (raw?.id ?? reaction.id) : record!.id;
        reaction.userId = raw.user_id;
        reaction.postId = raw.post_id;
        reaction.emojiName = raw.emoji_name;
        reaction.createAt = raw.create_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: REACTION,
        value,
        fieldsMapper,
    });
};
