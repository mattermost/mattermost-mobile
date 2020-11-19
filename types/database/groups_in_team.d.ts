// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
export default class GroupsInTeam extends Model {
    static table: string;
    static associations: Associations;
    groupId: string;
    memberCount: number;
    teamId: string;
    timezoneCount: number;
}
