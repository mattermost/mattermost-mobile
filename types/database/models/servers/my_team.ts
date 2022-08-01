// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from './team';
import type {Relation, Model} from '@nozbe/watermelondb';

/**
 * MyTeam represents only the teams that the current user belongs to
 */
declare class MyTeamModel extends Model {
    /** table (name) : MyTeam */
    static table: string;

    /** roles : The different permissions that this user has in the team, concatenated together with comma to form a single string. */
    roles: string;

    /** team : The relation to the TEAM table, that this user belongs to  */
    team: Relation<TeamModel>;
}

export default MyTeamModel;
