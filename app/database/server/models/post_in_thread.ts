// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

export default class PostInThread extends Model {
    static table = MM_TABLES.SERVER.POSTS_IN_THREAD
    static associations: Associations = {
        [MM_TABLES.SERVER.POST]: {type: 'belongs_to', key: 'post_id'},
    }

    @field('earliest') earliest!: number
    @field('latest') latest!: number
    @field('post_id') postId!: number
}
