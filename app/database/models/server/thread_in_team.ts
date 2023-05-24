// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type TeamModel from '@typings/database/models/servers/team';
import type ThreadModel from '@typings/database/models/servers/thread';
import type ThreadInTeamModelInterface from '@typings/database/models/servers/thread_in_team';

const {TEAM, THREAD, THREADS_IN_TEAM} = MM_TABLES.SERVER;

/**
 * ThreadInTeam model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
export default class ThreadInTeamModel extends Model implements ThreadInTeamModelInterface {
    /** table (name) : ThreadsInTeam */
    static table = THREADS_IN_TEAM;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A TEAM can have many THREADS_IN_TEAM. (relationship is N:1)*/
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** A THREAD can have many THREADS_IN_TEAM. (relationship is N:1)*/
        [THREAD]: {type: 'belongs_to', key: 'thread_id'},
    };

    /** thread_id: Associated thread identifier */
    @field('thread_id') threadId!: string;

    /** team_id: Associated team identifier */
    @field('team_id') teamId!: string;

    @immutableRelation(THREAD, 'thread_id') thread!: Relation<ThreadModel>;

    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;
}
