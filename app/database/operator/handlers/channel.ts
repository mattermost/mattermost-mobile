// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordChannelEqualToRaw,
    isRecordChannelInfoEqualToRaw,
    isRecordMyChannelEqualToRaw,
    isRecordMyChannelSettingsEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareChannelInfoRecord,
    prepareChannelRecord,
    prepareMyChannelRecord,
    prepareMyChannelSettingsRecord,
} from '@database/operator/prepareRecords/channel';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import Channel from '@typings/database/channel';
import ChannelInfo from '@typings/database/channel_info';
import {
    HandleChannelArgs,
    HandleChannelInfoArgs,
    HandleMyChannelArgs,
    HandleMyChannelSettingsArgs,
} from '@typings/database/database';
import MyChannel from '@typings/database/my_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';

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
     * handleChannel: Handler responsible for the Create/Update operations occurring on the CHANNEL entity from the 'Server' schema
     * @param {HandleChannelArgs} channelsArgs
     * @param {RawChannel[]} channelsArgs.channels
     * @param {boolean} channelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Channel[]|boolean}
     */
    handleChannel = async ({channels, prepareRecordsOnly = true}: HandleChannelArgs) => {
        if (!channels.length) {
            throw new DataOperatorException(
                'An empty "channels" array has been passed to the handleChannel method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: channels, key: 'id'});

        const records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordChannelEqualToRaw,
            operator: prepareChannelRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: CHANNEL,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleMyChannelSettings: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL_SETTINGS entity from the 'Server' schema
     * @param {HandleMyChannelSettingsArgs} settingsArgs
     * @param {RawMyChannelSettings[]} settingsArgs.settings
     * @param {boolean} settingsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {MyChannelSettings[]| boolean}
     */
    handleMyChannelSettings = async ({settings, prepareRecordsOnly = true}: HandleMyChannelSettingsArgs) => {
        if (!settings.length) {
            throw new DataOperatorException(
                'An empty "settings" array has been passed to the handleMyChannelSettings method',
            );
        }

        const rawValues = getUniqueRawsBy({raws: settings, key: 'channel_id'});

        const records = await this.handleEntityRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordMyChannelSettingsEqualToRaw,
            operator: prepareMyChannelSettingsRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: MY_CHANNEL_SETTINGS,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleChannelInfo: Handler responsible for the Create/Update operations occurring on the CHANNEL_INFO entity from the 'Server' schema
     * @param {HandleChannelInfoArgs} channelInfosArgs
     * @param {RawChannelInfo[]} channelInfosArgs.channelInfos
     * @param {boolean} channelInfosArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {ChannelInfo[]| boolean}
     */
    handleChannelInfo = async ({channelInfos, prepareRecordsOnly = true}: HandleChannelInfoArgs) => {
        if (!channelInfos.length) {
            throw new DataOperatorException(
                'An empty "channelInfos" array has been passed to the handleMyChannelSettings method',
            );
        }

        const rawValues = getUniqueRawsBy({
            raws: channelInfos,
            key: 'channel_id',
        });

        const records = await this.handleEntityRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordChannelInfoEqualToRaw,
            operator: prepareChannelInfoRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: CHANNEL_INFO,
        });

        return prepareRecordsOnly && records?.length && records;
    };

    /**
     * handleMyChannel: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL entity from the 'Server' schema
     * @param {HandleMyChannelArgs} myChannelsArgs
     * @param {RawMyChannel[]} myChannelsArgs.myChannels
     * @param {boolean} myChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {MyChannel[]| boolean}
     */
    handleMyChannel = async ({myChannels, prepareRecordsOnly = true}: HandleMyChannelArgs) => {
        if (!myChannels.length) {
            throw new DataOperatorException(
                'An empty "myChannels" array has been passed to the handleMyChannel method',
            );
        }

        const rawValues = getUniqueRawsBy({
            raws: myChannels,
            key: 'channel_id',
        });

        const records = await this.handleEntityRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordMyChannelEqualToRaw,
            operator: prepareMyChannelRecord,
            prepareRecordsOnly,
            rawValues,
            tableName: MY_CHANNEL,
        });

        return prepareRecordsOnly && records?.length && records;
    };
};

export default ChannelHandler;
