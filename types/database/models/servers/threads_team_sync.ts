// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type TeamModel from './team';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * ThreadsTeamSync model helps us to determine for which team we have loaded which threads
 * this was done mostly because of threads belonging in DM/GM channels,
 * so they belong in multiple teams.
 */
declare class ThreadsTeamSyncModel extends Model {
    /** table (name) : ThreadsTeamSync */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** earliest: Associated thread identifier */
    earliest: number;

    /** latest: Associated thread identifier */
    latest: number;

    /** team : The related record to the parent Team model */
    team: Relation<TeamModel>;
}

export default ThreadsTeamSyncModel;
