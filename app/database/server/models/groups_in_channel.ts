// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import relation from '@nozbe/watermelondb/decorators/relation';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Group from '@typings/database/group';

const {GROUP, GROUPS_IN_CHANNEL, CHANNEL} = MM_TABLES.SERVER;

export default class GroupsInChannel extends Model {
    static table = GROUPS_IN_CHANNEL

    static associations: Associations = {
        [GROUP]: {type: 'belongs_to', key: 'group_id'},
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},
    }

    @field('channel_id') channelId! : string
    @field('group_id') groupId! : string
    @field('member_count') memberCount! : number
    @field('timezone_count') timeZoneCount! : number

    @relation(CHANNEL, 'channel_id') groupChannel!: Group
}
