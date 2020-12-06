// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

const {TEAM, TEAM_CHANNEL_HISTORY} = MM_TABLES.SERVER;

export default class TeamChannelHistory extends Model {
    static table = TEAM_CHANNEL_HISTORY
    static associations: Associations = {
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('team_id') teamId!: string
    @json('channel_ids', (rawJson) => rawJson) channelIds!: string[]
}
