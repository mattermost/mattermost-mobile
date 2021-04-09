// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, relation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import Team from '@typings/database/team';

const {TEAM, MY_TEAM} = MM_TABLES.SERVER;

/**
 * MyTeam represents only the teams that the current user belongs to
 */
export default class MyTeam extends Model {
    /** table (entity name) : MyTeam */
    static table = MY_TEAM;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** TEAM and MY_TEAM have a 1:1 relationship. */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** is_unread : Boolean flag for unread messages on team level */
    @field('is_unread') isUnread!: boolean;

    /** mentions_count : Count of posts in which the user has been mentioned */
    @field('mentions_count') mentionsCount!: number;

    /** roles : The different permissions that this user has in the team, concatenated together with comma to form a single string. */
    @field('roles') roles!: string;

    /** team_id : The foreign key of the 'parent' Team entity */
    @field('team_id') teamId!: string;

    /** team : The relation to the entity TEAM, that this user belongs to  */
    @relation(MY_TEAM, 'team_id') team!: Relation<Team>
}
