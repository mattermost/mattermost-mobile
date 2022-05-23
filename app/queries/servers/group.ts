// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type GroupModel from '@typings/database/models/servers/group';

const {SERVER: {GROUP, GROUP_CHANNEL, GROUP_MEMBERSHIP, GROUP_TEAM}} = MM_TABLES;

export const getGroupById = async (database: Database, id: string) => {
    try {
        const group = (await database.collections.get<GroupModel>(GROUP).find(id));
        return group;
    } catch (e) {
        return undefined;
    }
};

export const queryGroupsByName = async (database: Database, name: string) => {
    return database.get<GroupModel>(GROUP).query(Q.where('name', Q.like(`%${Q.sanitizeLikeString(name)}%`)));
};

export const queryGroupsByChannelId = async (database: Database, id: string) => {
    return database.get<GroupModel>(GROUP).query(
        Q.on(GROUP_CHANNEL, 'channel_id', id),
    );
};

export const queryGroupsByTeamId = async (database: Database, id: string) => {
    return database.get<GroupModel>(GROUP).query(
        Q.on(GROUP_TEAM, 'team_id', id),
    );
};

export const queryGroupsByUserId = async (database: Database, id: string) => {
    return database.get<GroupModel>(GROUP).query(
        Q.on(GROUP_MEMBERSHIP, 'user', id),
    );
};

export const prepareGroups = (operator: ServerDataOperator, groups?: Group[]) => {
    return operator.handleGroups({groups, prepareRecordsOnly: true});
};

export async function prepareGroupChannels(operator: ServerDataOperator, groupChannels?: GroupChannel[]) {
    return operator.handleGroupChannels({groupChannels, prepareRecordsOnly: true});
}

export async function prepareGroupTeams(operator: ServerDataOperator, groupTeams?: GroupTeam[]) {
    return operator.handleGroupTeams({groupTeams, prepareRecordsOnly: true});
}

export async function prepareGroupMemberships(operator: ServerDataOperator, groupMemberships?: GroupMembership[]) {
    return operator.handleGroupMemberships({groupMemberships, prepareRecordsOnly: true});
}
