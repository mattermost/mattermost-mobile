// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type PostModel from '@typings/database/models/servers/post';

const {POST, RECENT_MENTIONS} = MM_TABLES.SERVER;

export default class RecentMentionsModel extends Model {
    /** table (name) : RecentMentions */
    static table = RECENT_MENTIONS;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A MENTION can have a POST.(relationship is 1:1) */
        [POST]: {type: 'belongs_to', key: 'id'},
    };

    /** order : The order of the mention item. */
    @field('update_at') updateAt!: number;

    /** post_id : The foreign key for the Post to which this mention belongs to. */
    @field('post_id') postId!: string;

    /** team : The relation to the POST, that this mention refers to  */
    @immutableRelation(POST, 'id') post!: Relation<PostModel>;
}
