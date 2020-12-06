// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import children from '@nozbe/watermelondb/decorators/children';
import field from '@nozbe/watermelondb/decorators/field';
import json from '@nozbe/watermelondb/decorators/json';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Channel from '@typings/database/channel';
import GroupsInTeam from '@typings/database/groups_in_team';
import MyTeam from '@typings/database/my_team';
import SlashCommand from '@typings/database/slash_command';
import TeamChannelHistory from '@typings/database/team_channel_history';
import TeamMembership from '@typings/database/team_membership';
import TeamSearchHistory from '@typings/database/team_search_history';

const {CHANNEL, GROUPS_IN_TEAM, TEAM, MY_TEAM, SLASH_COMMAND, TEAM_CHANNEL_HISTORY, TEAM_MEMBERSHIP, TEAM_SEARCH_HISTORY} = MM_TABLES.SERVER;

export default class Team extends Model {
    static table = TEAM
    static associations: Associations = {
        [CHANNEL]: {type: 'has_many', foreignKey: 'team_id'},
        [GROUPS_IN_TEAM]: {type: 'has_many', foreignKey: 'team_id'},
        [MY_TEAM]: {type: 'has_many', foreignKey: 'team_id'},
        [SLASH_COMMAND]: {type: 'has_many', foreignKey: 'team_id'},
        [TEAM_CHANNEL_HISTORY]: {type: 'has_many', foreignKey: 'team_id'},
        [TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'team_id'},
        [TEAM_SEARCH_HISTORY]: {type: 'has_many', foreignKey: 'team_id'},
    }

    @field('allow_open_invite') allowOpenInvite!: boolean
    @field('description') description!: string
    @field('display_name') displayName!: string
    @field('is_group_constrained') isGroupConstrained!: boolean
    @field('last_team_icon_updated_at') lastTeamIconUpdatedAt!: number
    @field('name') name!: string
    @field('type') type!: string
    @json('allowed_domains', (rawJson) => rawJson) allowedDomains!: string[]

    @children(CHANNEL) channel!: Channel
    @children(GROUPS_IN_TEAM) groupsInTeam!: GroupsInTeam
    @children(MY_TEAM) myTeam!: MyTeam
    @children(SLASH_COMMAND) slashCommand!: SlashCommand
    @children(TEAM_CHANNEL_HISTORY) teamChannelHistory!: TeamChannelHistory
    @children(TEAM_MEMBERSHIP) teamMembership!: TeamMembership
    @children(TEAM_SEARCH_HISTORY) teamSearchHistory!: TeamSearchHistory
}
