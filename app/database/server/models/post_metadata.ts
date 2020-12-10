// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, json, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Post from '@typings/database/post';

const {POST, POST_METADATA} = MM_TABLES.SERVER;

/**
 * PostMetadata allows us to have maximum information about the constituents of a POST
 */
export default class PostMetadata extends Model {
    /** table (entity name) : PostMetadata */
    static table = POST_METADATA

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A POST has a 1:N relationship with POST_METADATA*/
        [POST]: {type: 'belongs_to', key: 'post_id'},
    }

    /** post_id : The foreign key of the parent POST model */
    @field('post_id') postId!: string

    /** type : The type will work in tandem with the value present in the field 'data'.  One 'type' for each kind of 'data' */
    @field('type') type!: string

    /** data : Different types of data ranging from arrays, emojis, files to images and reactions. */
    @json('data', (rawJson) => rawJson) data!: string[]

    /** post: The record representing the POST parent.  */
    @relation(POST, 'post_id') post!: Post
}
