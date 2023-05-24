// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamThreadsSyncModelInterface from '@typings/database/models/servers/team_threads_sync';

const {TEAM, TEAM_THREADS_SYNC} = MM_TABLES.SERVER;

/**
 * ThreadInTeam model helps us to sync threads without creating any gaps between the threads
 * by keeping track of the latest and earliest last_replied_at timestamps loaded for a team.
 */
export default class TeamThreadsSyncModel extends Model implements TeamThreadsSyncModelInterface {
    /** table (name) : TeamThreadsSync */
    static table = TEAM_THREADS_SYNC;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {
        [TEAM]: {type: 'belongs_to', key: 'id'},
    };

    /** earliest: Oldest last_replied_at loaded through infinite loading */
    @field('earliest') earliest!: number;

    /** latest: Newest last_replied_at loaded during app init / navigating to global threads / pull to refresh */
    @field('latest') latest!: number;

    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;
}
