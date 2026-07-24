// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The DraftOutbox model holds one durable pending sync operation per draft key.
 */
declare class DraftOutboxModel extends Model {
    /** table (name) : DraftOutbox */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : Draft channel key */
    channelId: string;

    /** root_id : Empty for a channel draft; root post ID for a reply */
    rootId: string;

    /** team_id : Team scope captured at mutation time; empty string represents DM/GM scope */
    teamId: string;

    /** operation : upsert or delete */
    operation: DraftOutboxOperation;

    /** generation : Monotonically increasing local mutation generation for this key */
    generation: number;

    /** keep_local : For DELETE, preserve a visible unsyncable local Draft after removing its stale remote representation */
    keepLocal: boolean;

    /** attempt_count : Retry attempts for the current generation */
    attemptCount: number;

    /** next_attempt_at : Earliest retry time; 0 means immediately eligible */
    nextAttemptAt: number;

    /** status : pending, waiting_for_upload, blocked_upload, confirming_delete, or blocked */
    status: DraftOutboxStatus;

    /** last_error_code : Non-sensitive error classification only */
    lastErrorCode: string | null;

    /** deleted_fingerprint : Non-reversible content hash of the deleted content at DELETE enqueue time */
    deletedFingerprint: string | null;
}

export default DraftOutboxModel;
