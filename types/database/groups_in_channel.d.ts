// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import Group from '@typings/database/group';
export default class GroupsInChannel extends Model {
    static table: string;
    static associations: Associations;
    channelId: string;
    groupId: string;
    memberCount: number;
    timeZoneCount: number;
    groupChannel: Group;
}
