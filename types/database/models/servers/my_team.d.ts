// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * MyTeam represents only the teams that the current user belongs to
 */
export default class MyTeamModel extends Model {
    /** table (name) : MyTeam */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** is_unread : Boolean flag for unread messages on team level */
    isUnread: boolean;

    /** mentions_count : Count of posts in which the user has been mentioned */
    mentionsCount: number;

    /** roles : The different permissions that this user has in the team, concatenated together with comma to form a single string. */
    roles: string;

    /** team : The relation to the TEAM table, that this user belongs to  */
    team: Relation<TeamModel>;
}
