// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Draft model represents  the draft state of messages in Direct/Group messages and in channels
 */
declare class DraftModel extends Model {
    /** table (name) : Draft */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** channel_id : The foreign key pointing to the channel in which the draft was made */
    channelId: string;

    /** message : The draft message */
    message: string;

    /** root_id : The root_id will be empty most of the time unless the draft relates to a draft reply of a thread */
    rootId: string;

    /** files : The files field will hold an array of files object that have not yet been uploaded and persisted within the FILE table */
    files: FileInfo[];

    metadata?: PostMetadata;

    /** update_at : The local modification / UI ordering time (not a server revision) */
    updateAt: number;

    /** type : The post type of draft */
    type: string | null;

    /** server_update_at : Last server-stamped update_at observed for this draft; null/0 means never acknowledged on the server. Ancestry hint, not a revision */
    serverUpdateAt: number | null;

    /** props : Server draft props preserved and round-tripped even when mobile does not interpret them */
    props: DraftProps | null;

    /** file_ids : Authoritative portable server attachment IDs, including IDs whose metadata could not be hydrated */
    fileIds: string[];
}

export default DraftModel;
