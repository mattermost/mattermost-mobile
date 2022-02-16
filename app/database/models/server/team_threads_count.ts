// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type TeamModel from '@typings/database/models/servers/team';

const {TEAM, TEAM_THREADS_COUNT} = MM_TABLES.SERVER;

/**
 * The TeamThreadsCount model contains threads count information of a team.
 */
export default class TeamThreadsCount extends Model {
    /** table (name) : TeamThreadsCount */
    static table = TEAM_THREADS_COUNT;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A TEAM is associated to each record (relationship is 1:1) */
        [TEAM]: {type: 'belongs_to', key: 'id'},

    };

    /** total : The timestamp of when user last replied to the thread. */
    @field('total') total!: number;

    /** total_unread_mentions : The total number of unread mentions in the team. */
    @field('total_unread_mentions') totalUnreadMentions!: number;

    /** total_unread_threads : The total number of unread threads in the team. */
    @field('total_unread_threads') totalUnreadThreads!: number;

    /** team : The Team associated to this record */
    @immutableRelation(TEAM, 'id') team!: Relation<TeamModel>;
}
