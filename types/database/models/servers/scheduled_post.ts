// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The ScheduledPost model represents the Scheduled Post state of messages in Direct/Group messages and in channels
 */
declare class ScheduledPostModel extends Model {
    /** table (name) : ScheduledPost */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : The foreign key pointing to the channel in which the scheduled post was made */
    channelId: string;

    /** message : The schedule post message */
    message: string;

    /** root_id : The root_id will be empty most of the time unless the scheduled post is created inside a thread */
    rootId: string;

    /** files : The files field will hold an array of files object that have not yet been uploaded and persisted within the FILE table */
    files: FileInfo[];

    metadata: PostMetadata | null;

    /** create_at: The timestamp to when this scheduled post was created on the server */
    createAt: number;

    /** update_at : The timestamp to when this scheduled post was last updated on the server */
    updateAt: number;

    /** scheduled_at : The timestamp when the schedule post is scheduled at */
    scheduledAt: number;

    /** processed_at : The timestamp when the schedule post is processed at */
    processedAt: number;

    /** error_code : The reason message if the schedule post failed */
    errorCode: string;

    toApi: (user_id: string) => ScheduledPost;
}

export default ScheduledPostModel;
