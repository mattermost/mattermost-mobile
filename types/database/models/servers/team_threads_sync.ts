// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from './team';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * ThreadInTeam model helps us to sync threads without creating any gaps between the threads
 * by keeping track of the latest and earliest last_replied_at timestamps loaded for a team.
 */
declare class TeamThreadsSyncModel extends Model {
    /** table (name) : TeamThreadsSync */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** earliest: Oldest last_replied_at loaded through infinite loading */
    earliest: number;

    /** latest: Newest last_replied_at loaded during app init / navigating to global threads / pull to refresh */
    latest: number;

    /** team : The related record to the parent Team model */
    team: Relation<TeamModel>;
}

export default TeamThreadsSyncModel;
