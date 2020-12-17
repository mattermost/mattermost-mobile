// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Post from '@typings/database/post';

const {POST, POSTS_IN_THREAD} = MM_TABLES.SERVER;

/**
 * PostsInThread model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
export default class PostsInThread extends Model {
    /** table (entity name) : PostsInThread */
    static table = POSTS_IN_THREAD;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A POST has a 1:N relationship with POSTS_IN_THREAD  */
        [POST]: {type: 'belongs_to', key: 'post_id'},
    };

    /** latest : Upper bound of a timestamp range */
    @field('earliest') earliest: number | undefined;

    /** latest : Upper bound of a timestamp range */
    @field('latest') latest: number | undefined;

    /** post_id : The foreign key of the related Post model */
    @field('post_id') postId: number | undefined;

    /** post : The related record to the parent Post model */
    @immutableRelation(POST, 'post_id') post: Post | undefined;
}
