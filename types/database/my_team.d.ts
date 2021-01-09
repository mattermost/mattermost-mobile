// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Team from '@typings/database/team';

/**
 * MyTeam represents only the teams that the current user belongs to
 */
export default class MyTeam extends Model {
    /** table (entity name) : MyTeam */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** is_unread : Boolean flag for unread messages on team level */
    isUnread: boolean;

    /** mentions_count : Count of posts in which the user has been mentioned */
    mentionsCount: number;

    /** roles : The different permissions that this user has in the team */
    roles: string;

    /** team_id : The foreign key of the 'parent' Team entity */
    teamId: string;

    /** teams : The relation to the entity TEAM, that this user belongs to  */
    team: Relation<Team>;
}
