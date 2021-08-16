// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The GroupsTeam links the Team model with the Group model
 */
export default class GroupsTeamModel extends Model {
    /** table (name) : GroupsTeam */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** group_id : The foreign key to the related Group record */
    groupId: string;

    /** member_count : The number of users in the group */
    memberCount: number;

    /** team_id : The foreign key to the related Team record */
    teamId: string;

    /** timezone_count : The number of timezones */
    timezoneCount: number;

    /** team : The related record to the parent Team model */
    team: Relation<TeamModel>;

    /** group : The related record to the parent Team model */
    group: Relation<GroupModel>;
}
