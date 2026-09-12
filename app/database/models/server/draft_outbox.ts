// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import type DraftOutboxModelInterface from '@typings/database/models/servers/draft_outbox';

const {CHANNEL, DRAFT_OUTBOX} = MM_TABLES.SERVER;

/**
 * The DraftOutbox model holds one durable pending sync operation per draft key
 * (channel_id, root_id). It lets an explicitly deleted draft disappear immediately
 * from Draft queries while preserving the server DELETE/upsert intent across offline
 * periods and process restarts.
 */
export default class DraftOutboxModel extends Model implements DraftOutboxModelInterface {
    /** table (name) : DraftOutbox */
    static table = DRAFT_OUTBOX;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A DRAFT_OUTBOX row can belong to only one CHANNEL */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    };

    /** channel_id : Draft channel key */
    @field('channel_id') channelId!: string;

    /** root_id : Empty for a channel draft; root post ID for a reply */
    @field('root_id') rootId!: string;

    /** team_id : Team scope captured at mutation time; empty string represents DM/GM scope */
    @field('team_id') teamId!: string;

    /** operation : upsert or delete */
    @field('operation') operation!: DraftOutboxOperation;

    /** generation : Monotonically increasing local mutation generation for this key */
    @field('generation') generation!: number;

    /** keep_local : For DELETE, preserve a visible unsyncable local Draft after removing its stale remote representation */
    @field('keep_local') keepLocal!: boolean;

    /** attempt_count : Retry attempts for the current generation */
    @field('attempt_count') attemptCount!: number;

    /** next_attempt_at : Earliest retry time; 0 means immediately eligible */
    @field('next_attempt_at') nextAttemptAt!: number;

    /** status : pending, waiting_for_upload, blocked_upload, confirming_delete, or blocked */
    @field('status') status!: DraftOutboxStatus;

    /** last_error_code : Non-sensitive error classification only */
    @field('last_error_code') lastErrorCode!: string | null;

    /** deleted_fingerprint : For DELETE, a non-reversible content hash of the server-visible draft content at enqueue time; distinguishes a stale replica echo from new content written by another client */
    @field('deleted_fingerprint') deletedFingerprint!: string | null;
}
