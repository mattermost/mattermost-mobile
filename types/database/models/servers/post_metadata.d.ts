// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Post from './post';

/**
 * PostMetadata provides additional information on a POST
 */
export default class PostMetadata extends Model {
    /** table (name) : PostMetadata */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** post_id : The foreign key of the parent POST model */
    postId: string;

    /** type : The type will work in tandem with the value present in the field 'data'.  One 'type' for each kind of 'data' */
    type: string;

    /** data : Different types of data ranging from arrays, emojis, files to images and reactions. */
    data: PostMetadataTypes;

    /** post: The record representing the POST parent.  */
    post: Relation<Post>;
}
