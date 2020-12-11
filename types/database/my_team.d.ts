// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * MyTeam represents only the teams that the current user belongs to
 */
export default class MyTeam extends Model {
    /** table (entity name) : ChannelInfo */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** is_unread : Boolean flag for unread messages on team level */
    isUnread: boolean;

    /** mentions_count : Count of posts in which the user has been mentioned */
    mentionsCount: boolean;

    /** roles : The different permissions that this user has in that team */
    roles: string[];

    /** team_id : The foreign key of the 'parent' Team entity */
    teamId: boolean;

    /** teams : The remaining teams that this user can be part of  */
    teams: import('@nozbe/watermelondb').Query<Model>;
}
