// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInThreadModelInterface from '@typings/database/models/servers/posts_in_thread';

const {POST, POSTS_IN_THREAD} = MM_TABLES.SERVER;

/**
 * PostsInThread model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
export default class PostsInThreadModel extends Model implements PostsInThreadModelInterface {
    /** table (name) : PostsInThread */
    static table = POSTS_IN_THREAD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A POST can have multiple POSTS_IN_THREAD. (relationship is 1:N)*/
        [POST]: {type: 'belongs_to', key: 'root_id'},
    };

    /** root_id: Associated root post identifier */
    @field('root_id') rootId!: string;

    /** earliest : Lower bound of a timestamp range */
    @field('earliest') earliest!: number;

    /** latest : Upper bound of a timestamp range */
    @field('latest') latest!: number;

    /** post : The related record to the parent Post model */
    @immutableRelation(POST, 'root_id') post!: Relation<PostModel>;
}
