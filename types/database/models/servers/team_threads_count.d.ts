// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The TeamThreadsCount model contains threads count information of a team.
 */
export default class TeamThreadsCount extends Model {
    /** table (name) : TeamThreadsCount */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** total : The timestamp of when user last replied to the thread. */
    total: number;

    /** total_unread_mentions : The total number of unread mentions in the team. */
    totalUnreadMentions: number;

    /** total_unread_threads : The total number of unread threads in the team. */
    totalUnreadThreads: number;

    /** team : Query returning the team data for the current record */
    team: Relation<TeamModel>;
}
