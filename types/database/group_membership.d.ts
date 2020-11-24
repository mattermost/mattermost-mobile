// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import Group from '@typings/database/group';
import User from '@typings/database/user';
export default class GroupMembership extends Model {
    static table: string;
    static associations: Associations;
    groupId: string;
    userId: string;
    memberGroup: Group;
    memberUser: User;
}
