// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
import User from '@typings/database/user';
import Team from '@typings/database/team';
export default class TeamMembership extends Model {
    static table: string;
    static associations: Associations;
    teamId: string;
    userId: string;
    memberUser: User;
    memberTeam: Team;
}
