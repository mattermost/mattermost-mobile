// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, relation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Group from '@typings/database/group';
import User from '@typings/database/user';

const {GROUP, GROUP_MEMBERSHIP, USER} = MM_TABLES.SERVER;

export default class GroupMembership extends Model {
    static table = GROUP_MEMBERSHIP
    static associations: Associations = {
        [GROUP]: {type: 'belongs_to', key: 'group_id'},
        [USER]: {type: 'belongs_to', key: 'user_id'},
    }

    @field('group_id') groupId! : string
    @field('user_id') userId! : string

    @relation(GROUP, 'group_id') memberGroup!: Group
    @relation(USER, 'user_id') memberUser!: User
}
