// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query, Relation} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import {prepareDeletePost} from './post';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';

const {SERVER: {CHANNEL, MY_CHANNEL}} = MM_TABLES;

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

    const relations: Array<Relation<Model>> = [channel.membership, channel.info, channel.settings];
    for await (const relation of relations) {
        try {
            const model = await relation.fetch();
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
        channel.groupsChannel,
        channel.postsInChannel,
    ];
    for await (const children of associatedChildren) {
        const models = await children.fetch() as Model[];
        models.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }

    const posts = await channel.posts.fetch() as PostModel[];
    for await (const post of posts) {
        const preparedPost = await prepareDeletePost(post);
        preparedModels.push(...preparedPost);
    }

    return preparedModels;
};

export const queryAllChannelsForTeam = (database: Database, teamId: string) => {
    return database.get(CHANNEL).query(Q.where('team_id', teamId)).fetch() as Promise<ChannelModel[]>;
};

export const queryMyChannel = async (database: Database, channelId: string) => {
    try {
        const member = await database.get(MY_CHANNEL).find(channelId) as MyChannelModel;
        return member;
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
