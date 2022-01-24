// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {OperationType} from '@typings/database/enums';

import type{TransformerArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';
import type ThreadParticipantsModel from '@typings/database/models/servers/thread_participants';

const {
    THREAD,
    THREAD_PARTICIPANTS,
} = MM_TABLES.SERVER;

/**
 * transformThreadRecord: Prepares a record of the SERVER database 'Thread' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ThreadModel>}
 */
export const transformThreadRecord = ({action, database, value}: TransformerArgs): Promise<ThreadModel> => {
    const raw = value.raw as Thread;
    const record = value.record as ThreadModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (thread: ThreadModel) => {
        thread._raw.id = isCreateAction ? (raw?.id ?? thread.id) : record.id;
        thread.lastReplyAt = raw.last_reply_at;
        thread.lastViewedAt = raw.last_viewed_at;
        thread.replyCount = raw.reply_count;
        thread.isFollowing = raw.is_following ?? record.isFollowing;
        thread.unreadReplies = raw.unread_replies;
        thread.unreadMentions = raw.unread_mentions;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREAD,
        value,
        fieldsMapper,
    }) as Promise<ThreadModel>;
};

/**
 * transformThreadParticipantRecord: Prepares a record of the SERVER database 'ThreadParticipants' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ThreadParticipantsModel>}
 */
export const transformThreadparticipantRecord = ({action, database, value}: TransformerArgs): Promise<ThreadParticipantsModel> => {
    const raw = value.raw as ThreadParticipant;

    // id of reaction comes from server response
    const fieldsMapper = (reaction: ThreadParticipantsModel) => {
        reaction.threadId = raw.thread_id;
        reaction.userId = raw.id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREAD_PARTICIPANTS,
        value,
        fieldsMapper,
    }) as Promise<ThreadParticipantsModel>;
};
