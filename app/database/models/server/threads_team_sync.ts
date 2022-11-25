// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type TeamModel from '@typings/database/models/servers/team';
import type ThreadsTeamSyncModelInterface from '@typings/database/models/servers/threads_team_sync';

const {TEAM, THREADS_TEAM_SYNC} = MM_TABLES.SERVER;

/**
 * ThreadInTeam model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
export default class ThreadsTeamSyncModel extends Model implements ThreadsTeamSyncModelInterface {
    /** table (name) : ThreadsTeamSync */
    static table = THREADS_TEAM_SYNC;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [TEAM]: {type: 'belongs_to', key: 'id'},
    };

    /** oldest_at: Oldest thread loaded through infinite loading */
    @field('earliest') earliest!: number;

    /** newest_at: Newest thread loaded during app init / navigating to global threads / pull to refresh */
    @field('latest') latest!: number;

    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;
}
