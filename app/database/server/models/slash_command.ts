// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';

export default class SlashCommand extends Model {
    static table = MM_TABLES.SERVER.SLASH_COMMAND
    static associations: Associations = {
        [MM_TABLES.SERVER.TEAM]: {type: 'belongs_to', key: 'team_id'},
    }

    @field('auto_complete') autoComplete!: boolean
    @field('description') description!: string
    @field('display_name') displayName!: string
    @field('hint') hint!: string
    @field('method') method!: string
    @field('slash_id') slashId!: string
    @field('team_id') teamId!: string
    @field('token') token!: string
    @field('trigger') trigger!: string
}
