// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {identity, safeParseJSON} from '@utils/helpers';

import type ScheduledPostModelInterface from '@typings/database/models/servers/scheduled_post';

const {CHANNEL, POST, SCHEDULED_POST} = MM_TABLES.SERVER;

/**
 * The Draft model represents  the draft state of messages in Direct/Group messages and in channels
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

    /** root_id : The root_id will be empty most of the time unless the scheduled post is created inside the thread */
    @field('root_id') rootId!: string;

    @json('metadata', identity) metadata?: PostMetadata;

    /** update_at : The timestamp to when this scheduled post was last updated on the server */
    @field('update_at') updateAt!: number;

    /** scheduled_at : The timestamp when the schedule post is scheduled at */
    @field('scheduled_at') scheduledAt!: number;

    /** processed_at : The timestamp when the schedule post is processed at */
    @field('processed_at') processedAt!: number;

    /** error_code : The reason message if the schedule post failed */
    @field('error_code') errorCode!: string;
}
