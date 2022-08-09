// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type GroupModel from './group';
import type TeamModel from './team';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The GroupTeam model represents the 'association table' where many groups have teams and many teams are in
 * groups (relationship type N:N)
 */
declare class GroupTeamModel extends Model {
    /** table (name) : GroupTeam */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** group_id : The foreign key to the related Group record */
    groupId: string;

    /* team_id : The foreign key to the related Team record*/
    teamId: string;

    /** created_at : The timestamp for when it was created */
    createdAt: number;

    /** updated_at : The timestamp for when it was updated */
    updatedAt: number;

    /** deleted_at : The timestamp for when it was deleted */
    deletedAt: number;

    /** group : The related group */
    group: Relation<GroupModel>;

    /** team : The related team */
    team: Relation<TeamModel>;
}

export default GroupTeamModel;
