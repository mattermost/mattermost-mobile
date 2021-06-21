// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordChannelEqualToRaw,
    isRecordChannelInfoEqualToRaw,
    isRecordMyChannelEqualToRaw,
    isRecordMyChannelSettingsEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelInfoRecord,
    transformChannelRecord,
    transformMyChannelRecord,
    transformMyChannelSettingsRecord,
} from '@database/operator/server_data_operator/transformers/channel';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import Channel from '@typings/database/models/servers/channel';
import ChannelInfo from '@typings/database/models/servers/channel_info';
import {
    HandleChannelArgs,
    HandleChannelInfoArgs,
    HandleMyChannelArgs,
    HandleMyChannelSettingsArgs,
} from '@typings/database/database';
import MyChannel from '@typings/database/models/servers/my_channel';
import MyChannelSettings from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_INFO,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

export interface ChannelHandlerMix {
  handleChannel: ({channels, prepareRecordsOnly}: HandleChannelArgs) => Channel[] | boolean;
  handleMyChannelSettings: ({settings, prepareRecordsOnly}: HandleMyChannelSettingsArgs) => MyChannelSettings[] | boolean;
  handleChannelInfo: ({channelInfos, prepareRecordsOnly}: HandleChannelInfoArgs) => ChannelInfo[] | boolean;
  handleMyChannel: ({myChannels, prepareRecordsOnly}: HandleMyChannelArgs) => MyChannel[] | boolean;
}

const ChannelHandler = (superclass: any) => class extends superclass {
    /**
     * handleChannel: Handler responsible for the Create/Update operations occurring on the CHANNEL table from the 'Server' schema
     * @param {HandleChannelArgs} channelsArgs
     * @param {RawChannel[]} channelsArgs.channels
     * @param {boolean} channelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Channel[]}
     */
    handleChannel = async ({channels, prepareRecordsOnly = true}: HandleChannelArgs) => {
        let records: Channel[] = [];

        if (!channels.length) {
            throw new DataOperatorException(
                'An empty "channels" array has been passed to the handleChannel method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: channels, key: 'id'});

        records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordChannelEqualToRaw,
            transformer: transformChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL,
        });

        return records;
    };

    /**
     * handleMyChannelSettings: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL_SETTINGS table from the 'Server' schema
     * @param {HandleMyChannelSettingsArgs} settingsArgs
     * @param {RawMyChannelSettings[]} settingsArgs.settings
     * @param {boolean} settingsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {MyChannelSettings[]}
     */
    handleMyChannelSettings = async ({settings, prepareRecordsOnly = true}: HandleMyChannelSettingsArgs) => {
        let records: MyChannelSettings[] = [];

        if (!settings.length) {
            throw new DataOperatorException(
                'An empty "settings" array has been passed to the handleMyChannelSettings method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: settings, key: 'channel_id'});

        records = await this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordMyChannelSettingsEqualToRaw,
            transformer: transformMyChannelSettingsRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL_SETTINGS,
        });

        return records;
    };

    /**
     * handleChannelInfo: Handler responsible for the Create/Update operations occurring on the CHANNEL_INFO table from the 'Server' schema
     * @param {HandleChannelInfoArgs} channelInfosArgs
     * @param {RawChannelInfo[]} channelInfosArgs.channelInfos
     * @param {boolean} channelInfosArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {ChannelInfo[]}
     */
    handleChannelInfo = async ({channelInfos, prepareRecordsOnly = true}: HandleChannelInfoArgs) => {
        let records: ChannelInfo[] = [];

        if (!channelInfos.length) {
            throw new DataOperatorException(
                'An empty "channelInfos" array has been passed to the handleMyChannelSettings method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: channelInfos,
            key: 'channel_id',
        });

        records = await this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordChannelInfoEqualToRaw,
            transformer: transformChannelInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_INFO,
        });

        return records;
    };

    /**
     * handleMyChannel: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL table from the 'Server' schema
     * @param {HandleMyChannelArgs} myChannelsArgs
     * @param {RawMyChannel[]} myChannelsArgs.myChannels
     * @param {boolean} myChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {MyChannel[]}
     */
    handleMyChannel = async ({myChannels, prepareRecordsOnly = true}: HandleMyChannelArgs) => {
        let records: MyChannel[] = [];

        if (!myChannels.length) {
            throw new DataOperatorException(
                'An empty "myChannels" array has been passed to the handleMyChannel method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: myChannels,
            key: 'channel_id',
        });

        records = await this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordMyChannelEqualToRaw,
            transformer: transformMyChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL,
        });

        return records;
    };
};

export default ChannelHandler;
