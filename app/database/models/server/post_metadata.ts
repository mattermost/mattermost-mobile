// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type PostModel from '@typings/database/models/servers/post';

const {POST, POST_METADATA} = MM_TABLES.SERVER;

/**
 * PostMetadata provides additional information on a POST
 */
export default class PostMetadataModel extends Model {
    /** table (name) : PostMetadata */
    static table = POST_METADATA;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A POST can have multiple POST_METADATA.(relationship is 1:N)*/
        [POST]: {type: 'belongs_to', key: 'post_id'},
    };

    /** post_id : The foreign key of the parent POST model */
    @field('post_id') postId!: string;

    /** data : Different types of data ranging from embeds to images. */
    @json('data', safeParseJSON) data!: PostMetadata;

    /** post: The record representing the POST parent.  */
    @immutableRelation(POST, 'post_id') post!: Relation<PostModel>;
}
