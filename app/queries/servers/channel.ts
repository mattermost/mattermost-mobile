// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query, Relation} from '@nozbe/watermelondb';

import {General, Permissions} from '@constants';
import {MM_TABLES} from '@constants/database';
import {hasPermission} from '@utils/role';

import {prepareDeletePost} from './post';
import {queryRoles} from './role';
import {queryCurrentChannelId} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';

const {SERVER: {CHANNEL, MY_CHANNEL, CHANNEL_MEMBERSHIP}} = MM_TABLES;

export function prepareMissingChannelsForAllTeams(operator: ServerDataOperator, channels: Channel[], channelMembers: ChannelMembership[]): Array<Promise<Model[]>> | undefined {
    const channelInfos: ChannelInfo[] = [];
    const memberships = channelMembers.map((cm) => ({...cm, id: cm.channel_id}));

    for (const c of channels) {
        channelInfos.push({
            id: c.id,
            header: c.header,
            purpose: c.purpose,
            guest_count: 0,
            member_count: 0,
            pinned_post_count: 0,
        });
    }

    try {
        const channelRecords: Promise<Model[]> = operator.handleChannel({channels, prepareRecordsOnly: true});
        const channelInfoRecords: Promise<Model[]> = operator.handleChannelInfo({channelInfos, prepareRecordsOnly: true});
        const membershipRecords: Promise<Model[]> = operator.handleChannelMembership({channelMemberships: memberships, prepareRecordsOnly: true});
        const myChannelRecords: Promise<Model[]> = operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true});
        const myChannelSettingsRecords: Promise<Model[]> = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return undefined;
    }
}

export const prepareMyChannelsForTeam = async (operator: ServerDataOperator, teamId: string, channels: Channel[], channelMembers: ChannelMembership[]) => {
    const allChannelsForTeam = await queryAllChannelsForTeam(operator.database, teamId);
    const channelInfos: ChannelInfo[] = [];
    const memberships = channelMembers.map((cm) => ({...cm, id: cm.channel_id}));

    for await (const c of channels) {
        const storedChannel = allChannelsForTeam.find((sc) => sc.id === c.id);
        let storedInfo: ChannelInfoModel;
        let member_count = 0;
        let guest_count = 0;
        let pinned_post_count = 0;
        if (storedChannel) {
            storedInfo = (await storedChannel.info.fetch()) as ChannelInfoModel;
            member_count = storedInfo.memberCount;
            guest_count = storedInfo.guestCount;
            pinned_post_count = storedInfo.pinnedPostCount;
        }

        const member = memberships.find((m) => m.channel_id === c.id);
        if (member) {
            member.last_post_at = c.last_post_at;
        }

        channelInfos.push({
            id: c.id,
            header: c.header,
            purpose: c.purpose,
            guest_count,
            member_count,
            pinned_post_count,
        });
    }

    try {
        const channelRecords = operator.handleChannel({channels, prepareRecordsOnly: true});
        const channelInfoRecords = operator.handleChannelInfo({channelInfos, prepareRecordsOnly: true});
        const membershipRecords = operator.handleChannelMembership({channelMemberships: memberships, prepareRecordsOnly: true});
        const myChannelRecords = operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true});
        const myChannelSettingsRecords = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return undefined;
    }
};

export const prepareDeleteChannel = async (channel: ChannelModel): Promise<Model[]> => {
    const preparedModels: Model[] = [channel.prepareDestroyPermanently()];

    const relations: Array<Relation<Model>> = [channel.membership, channel.info, channel.settings, channel.categoryChannel];
    for await (const relation of relations) {
        try {
            const model = await relation?.fetch?.();
            if (model) {
                preparedModels.push(model.prepareDestroyPermanently());
            }
        } catch {
            // Record not found, do nothing
        }
    }

    const associatedChildren: Array<Query<any>> = [
        channel.members,
        channel.drafts,
        channel.postsInChannel,
    ];
    for await (const children of associatedChildren) {
        const models = await children?.fetch?.() as Model[] | undefined;
        models?.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }

    const posts = await channel.posts?.fetch?.() as PostModel[] | undefined;
    if (posts?.length) {
        for await (const post of posts) {
            const preparedPost = await prepareDeletePost(post);
            preparedModels.push(...preparedPost);
        }
    }

    return preparedModels;
};

export const queryAllChannelsForTeam = (database: Database, teamId: string) => {
    return database.get<ChannelModel>(CHANNEL).query(Q.where('team_id', teamId)).fetch();
};

export const queryAllMyChannelIds = (database: Database) => {
    return database.get<MyChannelModel>(MY_CHANNEL).query().fetchIds();
};

export const queryMyChannel = async (database: Database, channelId: string) => {
    try {
        const member = await database.get<MyChannelModel>(MY_CHANNEL).find(channelId);
        return member;
    } catch {
        return undefined;
    }
};

export const queryChannelById = async (database: Database, channelId: string) => {
    try {
        const channel = await database.get<ChannelModel>(CHANNEL).find(channelId);
        return channel;
    } catch {
        return undefined;
    }
};

export const queryChannelByName = async (database: Database, channelName: string) => {
    try {
        const channels = await database.get(CHANNEL).query(Q.where('name', channelName)).fetch() as ChannelModel[];
        if (channels.length) {
            return channels[0];
        }

        return undefined;
    } catch {
        return undefined;
    }
};

export const queryChannelsById = async (database: Database, channelIds: string[]): Promise<ChannelModel[]|undefined> => {
    try {
        const channels = (await database.get(CHANNEL).query(Q.where('id', Q.oneOf(channelIds))).fetch()) as ChannelModel[];
        return channels;
    } catch {
        return undefined;
    }
};

export const queryDefaultChannelForTeam = async (database: Database, teamId: string) => {
    let channel: ChannelModel|undefined;
    let canIJoinPublicChannelsInTeam = false;
    const roles = await queryRoles(database);

    if (roles.length) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS, true);
    }

    const myChannels = await database.get<ChannelModel>(CHANNEL).query(
        Q.on(MY_CHANNEL, 'id', Q.notEq('')),
        Q.and(
            Q.where('team_id', teamId),
            Q.where('delete_at', 0),
            Q.where('type', General.OPEN_CHANNEL),
        ),
        Q.sortBy('display_name', Q.asc),
    ).fetch();

    const defaultChannel = myChannels.find((c) => c.name === General.DEFAULT_CHANNEL);
    const myFirstTeamChannel = myChannels[0];

    if (defaultChannel || canIJoinPublicChannelsInTeam) {
        channel = defaultChannel;
    } else {
        channel = myFirstTeamChannel || defaultChannel;
    }

    return channel;
};

export const queryCurrentChannel = async (database: Database) => {
    const currentChannelId = await queryCurrentChannelId(database);
    if (currentChannelId) {
        const channels = await queryChannelsById(database, [currentChannelId]);
        if (channels?.length) {
            return channels[0];
        }
    }

    return undefined;
};

export const deleteChannelMembership = async (operator: ServerDataOperator, userId: string, channelId: string, prepareRecordsOnly = false) => {
    try {
        const channelMembership = await operator.database.get(CHANNEL_MEMBERSHIP).query(Q.where('user_id', Q.eq(userId)), Q.where('channel_id', Q.eq(channelId))).fetch();
        const models: Model[] = [];
        for (const membership of channelMembership) {
            models.push(membership.prepareDestroyPermanently());
        }
        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models);
        }
        return {models};
    } catch (error) {
        return {error};
    }
};

export const addChannelMembership = async (operator: ServerDataOperator, userId: string, channelId: string) => {
    try {
        await operator.handleChannelMembership({channelMemberships: [{channel_id: channelId, user_id: userId}], prepareRecordsOnly: false});
        return {};
    } catch (error) {
        return {error};
    }
};

export const queryAllMyChannelMembershipIds = async (database: Database, userId: string) => {
    return database.get(CHANNEL_MEMBERSHIP).query(Q.where('user_id', Q.eq(userId))).fetchIds();
};
