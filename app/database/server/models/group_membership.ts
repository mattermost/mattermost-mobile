// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class GroupMembership extends Model {
    static table = MM_TABLES.SERVER.GROUP_MEMBERSHIP
    static associations: Associations = {
        [MM_TABLES.SERVER.GROUP]: {type: 'belongs_to', key: 'group_id'},
        [MM_TABLES.SERVER.USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('group_id') groupId! : string
    @field('user_id') userId! : string
}
