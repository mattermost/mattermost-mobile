// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * PostMetadata provides additional information on a POST
 */
export default class PostMetadataModel extends Model {
    /** table (name) : PostMetadata */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** post_id : The foreign key of the parent POST model */
    postId: string;

    /** data : Different types of data ranging from arrays, emojis, files to images and reactions. */
    data: PostMetadata;

    /** post: The record representing the POST parent.  */
    post: Relation<PostModel>;
}
