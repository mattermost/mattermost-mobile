// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PostModel from './post';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * PostsInThread model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
declare class PostsInThreadModel extends Model {
    /** table (name) : PostsInThread */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** root_id: Associated root post identifier */
    rootId: string;

    /** earliest : Lower bound of a timestamp range */
    earliest: number;

    /** latest : Upper bound of a timestamp range */
    latest: number;

    /** post : The related record to the parent Post model */
    post: Relation<PostModel>;
}

export default PostsInThreadModel;
