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
export const transformThreadRecord = ({action, database, value}: TransformerArgs): Promise<ThreadModel> => {
    const raw = value.raw as ThreadWithLastFetchedAt;
    const record = value.record as ThreadModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (thread: ThreadModel) => {
        thread._raw.id = isCreateAction ? (raw?.id ?? thread.id) : record.id;

        // When post is individually fetched, we get last_reply_at as 0, so we use the record's value
        thread.lastReplyAt = raw.last_reply_at || record?.lastReplyAt;

        thread.lastViewedAt = raw.last_viewed_at ?? record?.lastViewedAt ?? 0;
        thread.replyCount = raw.reply_count;
        thread.isFollowing = raw.is_following ?? record?.isFollowing;
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
    }) as Promise<ThreadModel>;
};

/**
 * transformThreadParticipantRecord: Prepares a record of the SERVER database 'ThreadParticipant' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ThreadParticipantModel>}
 */
export const transformThreadParticipantRecord = ({action, database, value}: TransformerArgs): Promise<ThreadParticipantModel> => {
    const raw = value.raw as ThreadParticipant;

    // id of participant comes from server response
    const fieldsMapper = (participant: ThreadParticipantModel) => {
        participant.threadId = raw.thread_id;
        participant.userId = raw.id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREAD_PARTICIPANT,
        value,
        fieldsMapper,
    }) as Promise<ThreadParticipantModel>;
};

export const transformThreadInTeamRecord = ({action, database, value}: TransformerArgs): Promise<ThreadInTeamModel> => {
    const raw = value.raw as ThreadInTeam;

    const fieldsMapper = (threadInTeam: ThreadInTeamModel) => {
        threadInTeam.threadId = raw.thread_id;
        threadInTeam.teamId = raw.team_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: THREADS_IN_TEAM,
        value,
        fieldsMapper,
    }) as Promise<ThreadInTeamModel>;
};

export const transformTeamThreadsSyncRecord = ({action, database, value}: TransformerArgs): Promise<TeamThreadsSyncModel> => {
    const raw = value.raw as TeamThreadsSync;
    const record = value.record as TeamThreadsSyncModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (teamThreadsSync: TeamThreadsSyncModel) => {
        teamThreadsSync._raw.id = isCreateAction ? (raw?.id ?? teamThreadsSync.id) : record.id;
        teamThreadsSync.earliest = raw.earliest || record?.earliest;
        teamThreadsSync.latest = raw.latest || record?.latest;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TEAM_THREADS_SYNC,
        value,
        fieldsMapper,
    }) as Promise<TeamThreadsSyncModel>;
};
