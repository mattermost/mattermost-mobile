// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type ScheduledPostModelInterface from '@typings/database/models/servers/scheduled_post';

const {CHANNEL, POST, SCHEDULED_POST} = MM_TABLES.SERVER;

/**
 * The Scheduled post model represents a scheduled post anywhere in Mattermost - channels, DMs, or GMs.
 */
export default class ScheduledPostModel extends Model implements ScheduledPostModelInterface {
    /** table (name) : SchedulePost */
    static table = SCHEDULED_POST;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A SCHEDULED_POST can belong to only one CHANNEL  */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A SCHEDULED_POST is associated to only one POST */
        [POST]: {type: 'belongs_to', key: 'root_id'},
    };

    /** channel_id : The foreign key pointing to the channel in which the schedule post was made */
    @field('channel_id') channelId!: string;

    /** message : The scheduled post message */
    @field('message') message!: string;

    /** files : The files field will hold an array of file objects that have not yet been uploaded and persisted within the FILE table */
    @json('files', safeParseJSON) files!: FileInfo[];

    /** root_id : The root_id will be empty unless the scheduled post is created inside the thread */
    @field('root_id') rootId!: string;

    @json('metadata', safeParseJSON) metadata!: PostMetadata | null;

    /** create_at : The timestamp to when this scheduled post was created on the server */
    @field('create_at') createAt!: number;

    /** update_at : The timestamp to when this scheduled post was last updated on the server */
    @field('update_at') updateAt!: number;

    /** scheduled_at : The timestamp when the schedule post is scheduled at */
    @field('scheduled_at') scheduledAt!: number;

    /** processed_at : The timestamp when the schedule post is processed at */
    @field('processed_at') processedAt!: number;

    /** error_code : The reason message if the schedule post failed */
    @field('error_code') errorCode!: string;

    toApi = (user_id: string) => {
        const scheduledPost: ScheduledPost = {
            id: this.id,
            channel_id: this.channelId,
            root_id: this.rootId,
            message: this.message,
            files: this.files,
            metadata: this.metadata ? this.metadata : {},
            update_at: this.updateAt,
            scheduled_at: this.scheduledAt,
            processed_at: this.processedAt,
            error_code: this.errorCode,
            create_at: this.createAt,
            user_id,
        };
        if (this.metadata?.priority) {
            scheduledPost.priority = this.metadata.priority;
        }
        return scheduledPost;
    };
}
