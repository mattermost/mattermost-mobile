// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

import GroupMembership from '@typings/database/group_membership';
import GroupsInChannel from '@typings/database/groups_in_channel';
import GroupsInTeam from '@typings/database/groups_in_team';

export default class Group extends Model {
    static table: string;
    static associations: Associations;
    displayName: string;
    name: string;
    groupsInChannel: GroupsInChannel;
    groupsInTeam: GroupsInTeam;
    groupMembership: GroupMembership;
}
