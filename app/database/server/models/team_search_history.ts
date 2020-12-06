// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import field from '@nozbe/watermelondb/decorators/field';
import text from '@nozbe/watermelondb/decorators/text';
import json from '@nozbe/watermelondb/decorators/json';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

export default class TeamSearchHistory extends Model {
    static table = MM_TABLES.SERVER.TEAM_SEARCH_HISTORY
    static associations: Associations = {
        [MM_TABLES.SERVER.TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('created_at') createdAt!: number
    @field('team_id') teamId!: number
    @json('display_term', (rawJson) => rawJson) displayTerm!: string []
    @text('term') term!: number
}
