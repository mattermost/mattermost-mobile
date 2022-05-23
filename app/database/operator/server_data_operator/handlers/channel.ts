// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {
    buildMyChannelKey,
    buildChannelMembershipKey,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelInfoRecord,
    transformChannelMembershipRecord,
    transformChannelRecord,
    transformMyChannelRecord,
    transformMyChannelSettingsRecord,
} from '@database/operator/server_data_operator/transformers/channel';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {getIsCRTEnabled} from '@queries/servers/thread';

import type {HandleChannelArgs, HandleChannelInfoArgs, HandleChannelMembershipArgs, HandleMyChannelArgs, HandleMyChannelSettingsArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_INFO,
    CHANNEL_MEMBERSHIP,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

export interface ChannelHandlerMix {
  handleChannel: ({channels, prepareRecordsOnly}: HandleChannelArgs) => Promise<ChannelModel[]>;
  handleChannelMembership: ({channelMemberships, prepareRecordsOnly}: HandleChannelMembershipArgs) => Promise<ChannelMembershipModel[]>;
  handleMyChannelSettings: ({settings, prepareRecordsOnly}: HandleMyChannelSettingsArgs) => Promise<MyChannelSettingsModel[]>;
  handleChannelInfo: ({channelInfos, prepareRecordsOnly}: HandleChannelInfoArgs) => Promise<ChannelInfoModel[]>;
  handleMyChannel: ({channels, myChannels, isCRTEnabled, prepareRecordsOnly}: HandleMyChannelArgs) => Promise<MyChannelModel[]>;
}

const ChannelHandler = (superclass: any) => class extends superclass {
    /**
     * handleChannel: Handler responsible for the Create/Update operations occurring on the CHANNEL table from the 'Server' schema
     * @param {HandleChannelArgs} channelsArgs
     * @param {RawChannel[]} channelsArgs.channels
     * @param {boolean} channelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelModel[]>}
     */
    handleChannel = async ({channels, prepareRecordsOnly = true}: HandleChannelArgs): Promise<ChannelModel[]> => {
        if (!channels?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "channels" array has been passed to the handleChannel method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: channels, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL,
        });
    };

    /**
     * handleMyChannelSettings: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL_SETTINGS table from the 'Server' schema
     * @param {HandleMyChannelSettingsArgs} settingsArgs
     * @param {RawMyChannelSettings[]} settingsArgs.settings
     * @param {boolean} settingsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<MyChannelSettingsModel[]>}
     */
    handleMyChannelSettings = async ({settings, prepareRecordsOnly = true}: HandleMyChannelSettingsArgs): Promise<MyChannelSettingsModel[]> => {
        if (!settings?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "settings" array has been passed to the handleMyChannelSettings method',
            );

            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: settings, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            buildKeyRecordBy: buildMyChannelKey,
            transformer: transformMyChannelSettingsRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL_SETTINGS,
        });
    };

    /**
     * handleChannelInfo: Handler responsible for the Create/Update operations occurring on the CHANNEL_INFO table from the 'Server' schema
     * @param {HandleChannelInfoArgs} channelInfosArgs
     * @param {RawChannelInfo[]} channelInfosArgs.channelInfos
     * @param {boolean} channelInfosArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelInfoModel[]>}
     */
    handleChannelInfo = async ({channelInfos, prepareRecordsOnly = true}: HandleChannelInfoArgs): Promise<ChannelInfoModel[]> => {
        if (!channelInfos?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty "channelInfos" array has been passed to the handleMyChannelSettings method',
            );

            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: channelInfos as ChannelInfo[],
            key: 'id',
        });

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_INFO,
        });
    };

    /**
     * handleMyChannel: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL table from the 'Server' schema
     * @param {HandleMyChannelArgs} myChannelsArgs
     * @param {RawMyChannel[]} myChannelsArgs.myChannels
     * @param {boolean} myChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<MyChannelModel[]>}
     */
    handleMyChannel = async ({channels, myChannels, isCRTEnabled, prepareRecordsOnly = true}: HandleMyChannelArgs): Promise<MyChannelModel[]> => {
        if (!myChannels?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "myChannels" array has been passed to the handleMyChannel method',
            );

            return [];
        }

        if (!channels?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "channels" array has been passed to the handleMyChannel method',
            );

            return [];
        }

        const isCRT = isCRTEnabled ?? await getIsCRTEnabled(this.database);

        const channelMap = channels.reduce((result: Record<string, Channel>, channel) => {
            result[channel.id] = channel;
            return result;
        }, {});

        for (const my of myChannels) {
            const channel = channelMap[my.channel_id];
            if (channel) {
                const totalMsg = isCRT ? channel.total_msg_count_root! : channel.total_msg_count;
                const myMsgCount = isCRT ? my.msg_count_root! : my.msg_count;
                const msgCount = Math.max(0, totalMsg - myMsgCount);
                my.msg_count = msgCount;
                my.mention_count = isCRT ? my.mention_count_root! : my.mention_count;
                my.is_unread = msgCount > 0;
                my.last_post_at = (isCRT ? (my.last_root_post_at || my.last_post_at) : my.last_post_at) || 0;
            }
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: myChannels,
            key: 'id',
        });

        return this.handleRecords({
            fieldName: 'id',
            buildKeyRecordBy: buildMyChannelKey,
            transformer: transformMyChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL,
        });
    };

    /**
     * handleChannelMembership: Handler responsible for the Create/Update operations occurring on the CHANNEL_MEMBERSHIP table from the 'Server' schema
     * @param {HandleChannelMembershipArgs} channelMembershipsArgs
     * @param {ChannelMembership[]} channelMembershipsArgs.channelMemberships
     * @param {boolean} channelMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelMembershipModel[]>}
     */
    handleChannelMembership = async ({channelMemberships, prepareRecordsOnly = true}: HandleChannelMembershipArgs): Promise<ChannelMembershipModel[]> => {
        if (!channelMemberships?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty "channelMemberships" array has been passed to the handleChannelMembership method',
            );

            return [];
        }

        const memberships: ChannelMember[] = channelMemberships.map((m) => ({
            ...m,
            id: `${m.channel_id}-${m.user_id}`,
        }));

        const createOrUpdateRawValues = getUniqueRawsBy({raws: memberships, key: 'id'});

        return this.handleRecords({
            fieldName: 'user_id',
            buildKeyRecordBy: buildChannelMembershipKey,
            transformer: transformChannelMembershipRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_MEMBERSHIP,
        });
    };
};

export default ChannelHandler;
