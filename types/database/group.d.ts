// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';

import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';

/**
 * The Group model unifies the shareholders that contribute a group message.
 */
export default class Group extends Model {
    /** table (entity name) : Group */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** display_name : The display name for the group */
    displayName: string;

    /** name : The name of the group */
    name: string;

    /** groupsInChannel : All the related children records from GroupsInChannel */
    groupsInChannel: GroupsInChannel[];

    /** groupsInChannel : All the related children records from GroupsInTeam */
    groupsInTeam: GroupsInTeam[];

    /** groupsInChannel : All the related children records from GroupMembership */
    groupMembership: GroupMembership[];
}
