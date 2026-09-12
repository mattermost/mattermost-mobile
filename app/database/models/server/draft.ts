// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {identity, safeParseJSON, safeParseJSONStringArray} from '@utils/helpers';

import type DraftModelInterface from '@typings/database/models/servers/draft';

const {CHANNEL, DRAFT, POST} = MM_TABLES.SERVER;

/**
 * The Draft model represents  the draft state of messages in Direct/Group messages and in channels
 */
export default class DraftModel extends Model implements DraftModelInterface {
    /** table (name) : Draft */
    static table = DRAFT;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A DRAFT can belong to only one CHANNEL  */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A DRAFT is associated to only one POST */
        [POST]: {type: 'belongs_to', key: 'root_id'},
    };

    /** channel_id : The foreign key pointing to the channel in which the draft was made */
    @field('channel_id') channelId!: string;

    /** message : The draft message */
    @field('message') message!: string;

    /** root_id : The root_id will be empty most of the time unless the draft relates to a draft reply of a thread */
    @field('root_id') rootId!: string;

    /** files : The files field will hold an array of file objects that have not yet been uploaded and persisted within the FILE table */
    @json('files', safeParseJSON) files!: FileInfo[];

    @json('metadata', identity) metadata?: PostMetadata;

    /** update_at : The local modification / UI ordering time (not a server revision) */
    @field('update_at') updateAt!: number;

    /** type : The type of post  */
    @field('type') type!: PostTypesUserCreatable | null;

    /** server_update_at : Last server-stamped update_at observed for this draft. Null/0 means the draft has never been acknowledged as existing on the server. This is an ancestry/diagnostic hint, not a revision. */
    @field('server_update_at') serverUpdateAt!: number | null;

    /** props : Server draft props preserved and round-tripped even when mobile does not interpret them */
    @json('props', safeParseJSON) props!: DraftProps | null;

    /** file_ids : Authoritative portable server attachment IDs, including IDs whose metadata could not be hydrated */
    @json('file_ids', safeParseJSONStringArray) fileIds!: string[];
}
