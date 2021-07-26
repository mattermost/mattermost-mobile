// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

const {SERVER: {CHANNEL}} = MM_TABLES;

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
        const myChannelRecords = operator.handleMyChannel({myChannels: memberships, prepareRecordsOnly: true});
        const myChannelSettingsRecords = operator.handleMyChannelSettings({settings: memberships, prepareRecordsOnly: true});

        return [channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords];
    } catch {
        return undefined;
    }
};

export const queryAllChannelsForTeam = (database: Database, teamId: string) => {
    return database.get(CHANNEL).query(Q.where('team_id', teamId)).fetch() as Promise<ChannelModel[]>;
};
