// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type GroupModel from '@typings/database/models/servers/group';

const {SERVER: {GROUP, GROUP_CHANNEL, GROUP_TEAM}} = MM_TABLES;

export const queryGroupsByName = (database: Database, name: string) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(name)}%`)),
    );
};

export const queryGroupsByNameInTeam = (database: Database, name: string, teamId: string) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.on(GROUP_TEAM, 'team_id', teamId),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(name)}%`)),
    );
};

export const queryGroupsByNameInChannel = (database: Database, name: string, channelId: string) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.on(GROUP_CHANNEL, 'channel_id', channelId),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(name)}%`)),
    );
};

export const prepareGroups = (operator: ServerDataOperator, groups: Group[]) => {
    return operator.handleGroups({groups, prepareRecordsOnly: true});
};

export async function prepareGroupChannels(operator: ServerDataOperator, groupChannels: GroupChannel[]) {
    return operator.handleGroupChannels({groupChannels, prepareRecordsOnly: true});
}

export async function prepareGroupTeams(operator: ServerDataOperator, groupTeams: GroupTeam[]) {
    return operator.handleGroupTeams({groupTeams, prepareRecordsOnly: true});
}

// export async function prepareGroupMemberships(operator: ServerDataOperator, groupMemberships: Array<{group_id: string; user_id: string}>) {
//     return operator.handleGroupMemberships({groupMemberships, prepareRecordsOnly: true});
// }
