// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

import Team from '@typings/database/team';
import User from '@typings/database/user';

export default class TeamMembership extends Model {
    static table: string;
    static associations: Associations;
    teamId: string;
    userId: string;
    memberUser: User;
    memberTeam: Team;
}
