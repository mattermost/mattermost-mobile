// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CategoryModel from './category';
import type ChannelModel from './channel';
import type MyTeamModel from './my_team';
import type TeamChannelHistoryModel from './team_channel_history';
import type TeamMembershipModel from './team_membership';
import type TeamSearchHistoryModel from './team_search_history';
import type {Query, Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

/**
 * A Team houses and enables communication to happen across channels and users.
 */
declare class TeamModel extends Model {
    /** table (name) : Team */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** is_allow_open_invite : Boolean flag indicating if this team is open to the public */
    isAllowOpenInvite: boolean;

    /** description : The description for the team */
    description: string;

    /** display_name : The display name for the team */
    displayName: string;

    /** update_at : The timestamp to when this team was last updated on the server */
    updateAt: number;

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

    /** invite_id : The token id to use in invites to the team */
    inviteId: string;

    /** categories : All the categories associated with this team */
    categories: Query<CategoryModel>;

    /** channels : All the channels associated with this team */
    channels: Query<ChannelModel>;

    /** playbookRuns : All playbook runs for this channel */
    playbookRuns: Query<PlaybookRunModel>;

    /** myTeam : Retrieves additional information about the team that this user is possibly part of.  This query might yield no result if the user isn't part of a team. */
    myTeam: Relation<MyTeamModel>;

    /** teamChannelHistory : A history of the channels in this team that has been visited,  ordered by the most recent and capped to the last 5 */
    teamChannelHistory: Relation<TeamChannelHistoryModel>;

    /** members : All the users associated with this team */
    members: Query<TeamMembershipModel>;

    /** teamSearchHistories : All the searches performed on this team */
    teamSearchHistories: Query<TeamSearchHistoryModel>;
}

export default TeamModel;
