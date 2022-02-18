// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
const {SERVER: {GROUP, GROUP_MEMBERSHIP, GROUPS_TEAM, GROUPS_CHANNEL}} = MM_TABLES;

export const queryAllGroups = (database: Database, includeDeleted = false) => {
    const clauses: Q.Clause[] = [];
    if (includeDeleted) {
        clauses.push(Q.where('delete_at', Q.notEq(0)));
    }
    return database.get<GroupModel>(GROUP).query(...clauses);
};

export const queryAllGroupMemberships = (database: Database) => {
    return database.get<GroupMembershipModel>(GROUP_MEMBERSHIP).query();
};

export const queryGroupsForTeamAndChannel = (database: Database, teamId: string, channelId: string) => {
    return database.get<GroupModel>(GROUP).query(
        Q.experimentalJoinTables([GROUPS_TEAM, GROUPS_CHANNEL]),
        Q.or(Q.on(GROUPS_TEAM, 'team_id', teamId), Q.on(GROUPS_CHANNEL, 'channel_id', channelId)),
    );
};
