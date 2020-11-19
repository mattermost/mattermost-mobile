// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {MM_TABLES} from '@constants/database';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import children from '@nozbe/watermelondb/decorators/children';
import TeamChannelHistory from '@typings/database/team_channel_history';
import SlashCommand from '@typings/database/slash_command';
import MyTeam from '@typings/database/my_team';
import GroupsInTeam from '@typings/database/groups_in_team';
import TeamMembership from '@typings/database/team_membership';
import TeamSearchHistory from '@typings/database/team_search_history';
import Channel from '@typings/database/channel';

export default class Team extends Model {
    static table = MM_TABLES.SERVER.TEAM
    static associations: Associations = {
        [MM_TABLES.SERVER.CHANNEL]: {type: 'has_many', foreignKey: 'team_id'},
        [MM_TABLES.SERVER.GROUPS_IN_TEAM]: {type: 'has_many', foreignKey: 'team_id'},
        [MM_TABLES.SERVER.MY_TEAM]: {type: 'has_many', foreignKey: 'team_id'},
        [MM_TABLES.SERVER.SLASH_COMMAND]: {type: 'has_many', foreignKey: 'team_id'},
        [MM_TABLES.SERVER.TEAM_CHANNEL_HISTORY]: {type: 'has_many', foreignKey: 'team_id'},
        [MM_TABLES.SERVER.TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'team_id'},
        [MM_TABLES.SERVER.TEAM_SEARCH_HISTORY]: {type: 'has_many', foreignKey: 'team_id'},
    }

    @field('allowed_open_invite') allowedOpenInvite!: boolean
    @field('description') description!: string
    @field('display_name') displayName!: string
    @field('is_group_constrained') isGroupConstrained!: boolean
    @field('last_team_icon_updated_at') lastTeamIconUpdatedAt!: number
    @field('name') name!: string
    @field('team_id') teamId!: string
    @field('type') type!: string
    @json('allowed_domains', (rawJson) => rawJson) allowedDomains!: string[]

    @children(MM_TABLES.SERVER.CHANNEL) channel!: Channel
    @children(MM_TABLES.SERVER.GROUPS_IN_TEAM) groupsInTeam!: GroupsInTeam
    @children(MM_TABLES.SERVER.MY_TEAM) myTeam!: MyTeam
    @children(MM_TABLES.SERVER.SLASH_COMMAND) slashCommand!: SlashCommand
    @children(MM_TABLES.SERVER.TEAM_CHANNEL_HISTORY) teamChannelHistory!: TeamChannelHistory
    @children(MM_TABLES.SERVER.TEAM_MEMBERSHIP) teamMembership!: TeamMembership
    @children(MM_TABLES.SERVER.TEAM_SEARCH_HISTORY) teamSearchHistory!: TeamSearchHistory
}
