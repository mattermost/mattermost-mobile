// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {TransformerArgs} from '@typings/database/database';
import type TeamThreadsSyncModel from '@typings/database/models/servers/team_threads_sync';
import type ThreadModel from '@typings/database/models/servers/thread';
import type ThreadInTeamModel from '@typings/database/models/servers/thread_in_team';
import type ThreadParticipantModel from '@typings/database/models/servers/thread_participant';

const {
    THREAD,
    THREAD_PARTICIPANT,
    THREADS_IN_TEAM,
    TEAM_THREADS_SYNC,
} = MM_TABLES.SERVER;

/**
 * transformThreadRecord: Prepares a record of the SERVER database 'Thread' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ThreadModel>}
 */
export const transformThreadRecord = ({action, database, value}: TransformerArgs<ThreadModel, ThreadWithLastFetchedAt>): Promise<ThreadModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (thread: ThreadModel) => {
        thread._raw.id = isCreateAction ? (raw?.id ?? thread.id) : record!.id;

        // When post is individually fetched, we get last_reply_at as 0, so we use the record's value.
        // If there is no reply at, we default to the post's create_at
        thread.lastReplyAt = raw.last_reply_at || record?.lastReplyAt || raw.post.create_at;

        thread.lastViewedAt = raw.last_viewed_at ?? record?.lastViewedAt ?? 0;
        thread.replyCount = raw.reply_count;
        thread.isFollowing = raw.is_following ?? record?.isFollowing ?? false;
        thread.unreadReplies = raw.unread_replies ?? record?.unreadReplies ?? 0;
        thread.unreadMentions = raw.unread_mentions ?? record?.unreadMentions ?? 0;
        thread.viewedAt = record?.viewedAt || 0;
        thread.lastFetchedAt = Math.max(record?.lastFetchedAt || 0, raw.lastFetchedAt || 0);
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREAD,
        value,
        fieldsMapper,
    });
};

/**
 * transformThreadParticipantRecord: Prepares a record of the SERVER database 'ThreadParticipant' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ThreadParticipantModel>}
 */
export const transformThreadParticipantRecord = ({action, database, value}: TransformerArgs<ThreadParticipantModel, ThreadParticipant>): Promise<ThreadParticipantModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // id of participant comes from server response
    const fieldsMapper = (participant: ThreadParticipantModel) => {
        participant._raw.id = isCreateAction ? `${raw.thread_id}-${raw.id}` : record!.id;
        participant.threadId = raw.thread_id;
        participant.userId = raw.id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREAD_PARTICIPANT,
        value,
        fieldsMapper,
    });
};

export const transformThreadInTeamRecord = ({action, database, value}: TransformerArgs<ThreadInTeamModel, ThreadInTeam>): Promise<ThreadInTeamModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (threadInTeam: ThreadInTeamModel) => {
        threadInTeam._raw.id = isCreateAction ? `${raw.thread_id}-${raw.team_id}` : record!.id;
        threadInTeam.threadId = raw.thread_id;
        threadInTeam.teamId = raw.team_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREADS_IN_TEAM,
        value,
        fieldsMapper,
    });
};

export const transformTeamThreadsSyncRecord = ({action, database, value}: TransformerArgs<TeamThreadsSyncModel, TeamThreadsSync>): Promise<TeamThreadsSyncModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (teamThreadsSync: TeamThreadsSyncModel) => {
        teamThreadsSync._raw.id = isCreateAction ? (raw?.id ?? teamThreadsSync.id) : record!.id;
        teamThreadsSync.earliest = raw.earliest || record?.earliest || 0;
        teamThreadsSync.latest = raw.latest || record?.latest || 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_THREADS_SYNC,
        value,
        fieldsMapper,
    });
};
