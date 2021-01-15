// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Draft model represents  the draft state of messages in Direct/Group messages and in channels
 */
export default class Draft extends Model {
    /** table (entity name) : Draft */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** channel_id : The foreign key pointing to the channel in which the draft was made */
    channelId: string;

    /** message : The draft message */
    message: string;

    /** root_id : The root_id will be empty most of the time unless the draft relates to a draft reply of a thread */
    rootId: string;

    /** files : The files field will hold an array of files object that have not yet been uploaded and persisted within the FILE entity */
    files: FileInfo[];
}
