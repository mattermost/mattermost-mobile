// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type SlashCommandModel from '@typings/database/models/servers/slash_command';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const {
    CHANNEL,
    TEAM,
    MY_TEAM,
    SLASH_COMMAND,
    TEAM_CHANNEL_HISTORY,
    TEAM_MEMBERSHIP,
    TEAM_SEARCH_HISTORY,
} = MM_TABLES.SERVER;

/**
 * A Team houses and enables communication to happen across channels and users.
 */
export default class TeamModel extends Model {
    /** table (name) : Team */
    static table = TEAM;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A TEAM has a 1:N relationship with CHANNEL. A TEAM can possess multiple channels */
        [CHANNEL]: {type: 'has_many', foreignKey: 'team_id'},

        /** A TEAM can be associated to one MY_TEAM (relationship is 1:1) */
        [MY_TEAM]: {type: 'has_many', foreignKey: 'id'},

        /** A TEAM has a 1:N relationship with SLASH_COMMAND. A TEAM can possess multiple slash commands */
        [SLASH_COMMAND]: {type: 'has_many', foreignKey: 'team_id'},

        /** A TEAM has a 1:N relationship with TEAM_MEMBERSHIP. A TEAM can regroup multiple users */
        [TEAM_MEMBERSHIP]: {type: 'has_many', foreignKey: 'team_id'},

        /** A TEAM has a 1:N relationship with TEAM_SEARCH_HISTORY. A TEAM can possess multiple search histories*/
        [TEAM_SEARCH_HISTORY]: {type: 'has_many', foreignKey: 'team_id'},
    };

    /** is_allow_open_invite : Boolean flag indicating if this team is open to the public */
    @field('is_allow_open_invite') isAllowOpenInvite!: boolean;

    /** description : The description for the team */
    @field('description') description!: string;

    /** display_name : The display name for the team */
    @field('display_name') displayName!: string;

    /** is_group_constrained : Boolean flag indicating if members are managed groups */
    @field('is_group_constrained') isGroupConstrained!: boolean;

    /** last_team_icon_updated_at : Timestamp for when this team's icon has been updated last */
    @field('last_team_icon_updated_at') lastTeamIconUpdatedAt!: number;

    /** name : The name for the team */
    @field('name') name!: string;

    /** update_at : The timestamp to when this team was last updated on the server */
    @field('update_at') updateAt!: number;

    /** type : The type of team ( e.g. open/private ) */
    @field('type') type!: string;

    /** allowed_domains : List of domains that can join this team */
    @field('allowed_domains') allowedDomains!: string;

    /** channels : All the channels associated with this team */
    @children(CHANNEL) channels!: ChannelModel[];

    /** myTeam : Retrieves additional information about the team that this user is possibly part of. */
    @immutableRelation(MY_TEAM, 'id') myTeam!: Relation<MyTeamModel>;

    /** slashCommands : All the slash commands associated with this team */
    @children(SLASH_COMMAND) slashCommands!: SlashCommandModel[];

    /** teamChannelHistory : A history of the channels in this team that has been visited,  ordered by the most recent and capped to the last 5 */
    @immutableRelation(TEAM_CHANNEL_HISTORY, 'id') teamChannelHistory!: Relation<TeamChannelHistoryModel>;

    /** members : All the users associated with this team */
    @children(TEAM_MEMBERSHIP) members!: TeamMembershipModel[];

    /** teamSearchHistories : All the searches performed on this team */
    @children(TEAM_SEARCH_HISTORY) teamSearchHistories!: TeamSearchHistoryModel[];
}
