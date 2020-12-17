// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, json, lazy} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';

const {TEAM, MY_TEAM} = MM_TABLES.SERVER;

/**
 * MyTeam represents only the teams that the current user belongs to
 */
export default class MyTeam extends Model {
    /** table (entity name) : ChannelInfo */
    static table = MY_TEAM;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** TEAM and MY_TEAM share a 1:1 relationship. */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},
    };

    /** is_unread : Boolean flag for unread messages on team level */
    @field('is_unread') isUnread: boolean | undefined;

    /** mentions_count : Count of posts in which the user has been mentioned */
    @field('mentions_count') mentionsCount: boolean | undefined;

    /** roles : The different permissions that this user has in that team */
    @json('roles', (rawJson) => rawJson) roles: string[] | undefined;

    /** team_id : The foreign key of the 'parent' Team entity */
    @field('team_id') teamId: boolean | undefined;

    /** teams : The remaining teams that this user can be part of  */
    @lazy teams = this.collections.get(TEAM).query(Q.on(MY_TEAM, 'team_id', this.teamId));
}
