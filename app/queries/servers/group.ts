// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {sanitizeLikeString} from '@helpers/database';

import type GroupModel from '@typings/database/models/servers/group';
import type GroupChannelModel from '@typings/database/models/servers/group_channel';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupTeamModel from '@typings/database/models/servers/group_team';

const {SERVER: {GROUP, GROUP_CHANNEL, GROUP_MEMBERSHIP, GROUP_TEAM}} = MM_TABLES;

export const queryGroupsByName = (database: Database, name: string) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.where('name', Q.like(`%${sanitizeLikeString(name)}%`)),
    );
};

export const queryGroupsByNames = (database: Database, names: string[]) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.where('name', Q.oneOf(names)),
    );
};

export const queryGroupsByNameInTeam = (database: Database, name: string, teamId: string) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.on(GROUP_TEAM, 'team_id', teamId),
        Q.where('name', Q.like(`%${sanitizeLikeString(name)}%`)),
    );
};

export const queryGroupsByNameInChannel = (database: Database, name: string, channelId: string) => {
    return database.collections.get<GroupModel>(GROUP).query(
        Q.on(GROUP_CHANNEL, 'channel_id', channelId),
        Q.where('name', Q.like(`%${sanitizeLikeString(name)}%`)),
    );
};

export const queryGroupChannelForChannel = (database: Database, channelId: string) => {
    return database.collections.get<GroupChannelModel>(GROUP_CHANNEL).query(
        Q.where('channel_id', channelId),
    );
};

export const queryGroupMembershipForMember = (database: Database, userId: string) => {
    return database.collections.get<GroupMembershipModel>(GROUP_MEMBERSHIP).query(
        Q.where('user_id', userId),
    );
};

export const queryGroupTeamForTeam = (database: Database, teamId: string) => {
    return database.collections.get<GroupTeamModel>(GROUP_TEAM).query(
        Q.where('team_id', teamId),
    );
};

export const deleteGroupMembershipById = (database: Database, id: string) => {
    return database.collections.get<GroupMembershipModel>(GROUP_MEMBERSHIP).find(id).then((model) => model.destroyPermanently());
};

export const deleteGroupTeamById = (database: Database, id: string) => {
    return database.collections.get<GroupTeamModel>(GROUP_TEAM).find(id).then((model) => model.destroyPermanently());
};

export const deleteGroupChannelById = (database: Database, id: string) => {
    return database.collections.get<GroupChannelModel>(GROUP_CHANNEL).find(id).then((model) => model.destroyPermanently());
};
