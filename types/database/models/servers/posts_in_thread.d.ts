// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Post from './post';

/**
 * PostsInThread model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
export default class PostsInThread extends Model {
    /** table (name) : PostsInThread */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** earliest : Lower bound of a timestamp range */
    earliest: number;

    /** latest : Upper bound of a timestamp range */
    latest: number;

    /** post_id : The foreign key of the related Post model */
    postId: string;

    /** post : The related record to the parent Post model */
    post: Relation<Post>;
}
