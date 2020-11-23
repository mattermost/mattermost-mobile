// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import TeamChannelHistory from '@typings/database/team_channel_history';
import SlashCommand from '@typings/database/slash_command';
import MyTeam from '@typings/database/my_team';
import GroupsInTeam from '@typings/database/groups_in_team';
import TeamMembership from '@typings/database/team_membership';
import TeamSearchHistory from '@typings/database/team_search_history';
import Channel from '@typings/database/channel';
export default class Team extends Model {
    static table: string;
    static associations: Associations;
    allowOpenInvite: boolean;
    description: string;
    displayName: string;
    isGroupConstrained: boolean;
    lastTeamIconUpdatedAt: number;
    name: string;
    type: string;
    allowedDomains: string[];
    channel: Channel;
    groupsInTeam: GroupsInTeam;
    myTeam: MyTeam;
    slashCommand: SlashCommand;
    teamChannelHistory: TeamChannelHistory;
    teamMembership: TeamMembership;
    teamSearchHistory: TeamSearchHistory;
}
