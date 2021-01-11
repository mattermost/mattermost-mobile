// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Channel from '@typings/database/channel';
import GroupsInTeam from '@typings/database/groups_in_team';
import MyTeam from '@typings/database/my_team';
import SlashCommand from '@typings/database/slash_command';
import TeamChannelHistory from '@typings/database/team_channel_history';
import TeamMembership from '@typings/database/team_membership';
import TeamSearchHistory from '@typings/database/team_search_history';

/**
 * A Team houses and enables communication to happen across channels and users.
 */
export default class Team extends Model {
    /** table (entity name) : Team */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** is_allow_open_invite : Boolean flag indicating if this team is open to the public */
    isAllowOpenInvite: boolean;

    /** description : The description for the team */
    description: string;

    /** display_name : The display name for the team */
    displayName: string;

    /** is_group_constrained : Boolean flag indicating if members are managed groups */
    isGroupConstrained: boolean;

    /** last_team_icon_updated_at : Timestamp for when this team's icon has been updated last */
    lastTeamIconUpdatedAt: number;

    /** name : The name for the team */
    name: string;

    /** type : The type of team ( e.g. open/private ) */
    type: string;

    /** allowed_domains : List of domains that can join this team */
    allowedDomains: string;

    /** channels : All the channels associated with this team */
    channels: Channel[];

    /** groupsInTeam : All the groups associated with this team */
    groupsInTeam: GroupsInTeam[];

    /** myTeam : Lazy query property returning only the team member that this user is part of  */
    myTeam: Query<MyTeam>;

    /** slashCommands : All the slash commands associated with this team */
    slashCommands: SlashCommand[];

    /** teamChannelHistory : A history of the channels in this team that has been visited,  ordered by the most recent and capped to the last 5 */
    teamChannelHistory: Query<TeamChannelHistory>;

    /** members : All the users associated with this team */
    members: TeamMembership[];

    /** teamSearchHistories : All the searches performed on this team */
    teamSearchHistories: TeamSearchHistory[];
}
