// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';

export default class MyTeam extends Model {
    static table = MM_TABLES.SERVER.MY_TEAM
    static associations: Associations = {
        [MM_TABLES.SERVER.TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('is_unread') isUnread!: boolean
    @field('mentions_count') mentionsCount!: boolean
    @json('roles', (rawJson) => rawJson) roles!: string[]
    @field('team_id') teamId!: boolean
}
