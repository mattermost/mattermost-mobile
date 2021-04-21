// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {PostMetadataData, PostMetadataType} from '@typings/database/database';
import Post from '@typings/database/post';

const {POST, POST_METADATA} = MM_TABLES.SERVER;

/**
 * PostMetadata provides additional information on a POST
 */
export default class PostMetadata extends Model {
    /** table (entity name) : PostMetadata */
    static table = POST_METADATA;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A POST can have multiple POST_METADATA.(relationship is 1:N)*/
        [POST]: {type: 'belongs_to', key: 'post_id'},
    };

    /** post_id : The foreign key of the parent POST model */
    @field('post_id') postId!: string;

    /** type : The type will work in tandem with the value present in the field 'data'.  One 'type' for each kind of 'data' */
    @field('type') type!: PostMetadataType;

    /** data : Different types of data ranging from embeds to images. */
    @json('data', (rawJson) => rawJson) data!: PostMetadataData;

    /** post: The record representing the POST parent.  */
    @immutableRelation(POST, 'post_id') post!: Relation<Post>;
}
