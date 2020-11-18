// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Model} from '@nozbe/watermelondb';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class GroupsInChannel extends Model {
    static table = MM_TABLES.SERVER.GROUPS_IN_CHANNEL

    @field('member_count') memberCount! : number
    @field('timezone_count') timeZoneCount! : number

    // FIXME : add relation to teamId
}
