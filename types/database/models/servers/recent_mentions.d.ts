// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

export default class RecentMentionsModel extends Model {
    /** table (name) : Post */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** post_id : The foreign key for the Post to which this mentions belongs to. */
    postId: string;

    /** update_at : The timestamp to when this mention was last updated on the server */
    updateAt!: number;

    /** post: The post which is presenting this Mention */
    post: Relation<PostModel>;
}
