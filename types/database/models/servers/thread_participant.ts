// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ThreadModel from './thread';
import type UserModel from './user';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Thread Participants Model is used to show the participants of a thread
 */
declare class ThreadParticipantsModel extends Model {
    /** table (name) : ThreadParticipants */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** thread_id : The related Thread's foreign key to which this participant belongs */
    threadId: string;

    /** user_id : The user id of the user participating in the thread */
    userId: string;

    /** thread : The related record to the Thread model */
    thread: Relation<ThreadModel>;

    /** user : The related record to the User model */
    user: Relation<UserModel>;
}

export default ThreadParticipantsModel;
