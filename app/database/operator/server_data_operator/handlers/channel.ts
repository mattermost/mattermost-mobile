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

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type {HandleChannelArgs, HandleChannelInfoArgs, HandleMyChannelArgs, HandleMyChannelSettingsArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_INFO,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

export interface ChannelHandlerMix {
  handleChannel: ({channels, prepareRecordsOnly}: HandleChannelArgs) => Promise<ChannelModel[]>;
  handleMyChannelSettings: ({settings, prepareRecordsOnly}: HandleMyChannelSettingsArgs) => Promise<MyChannelSettingsModel[]>;
  handleChannelInfo: ({channelInfos, prepareRecordsOnly}: HandleChannelInfoArgs) => Promise<ChannelInfoModel[]>;
  handleMyChannel: ({myChannels, prepareRecordsOnly}: HandleMyChannelArgs) => Promise<MyChannelModel[]>;
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
    handleChannel = ({channels, prepareRecordsOnly = true}: HandleChannelArgs): Promise<ChannelModel[]> => {
        if (!channels.length) {
            throw new DataOperatorException(
                'An empty "channels" array has been passed to the handleChannel method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: channels, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordChannelEqualToRaw,
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
    handleMyChannelSettings = ({settings, prepareRecordsOnly = true}: HandleMyChannelSettingsArgs): Promise<MyChannelSettingsModel[]> => {
        if (!settings.length) {
            throw new DataOperatorException(
                'An empty "settings" array has been passed to the handleMyChannelSettings method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: settings, key: 'channel_id'});

        return this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordMyChannelSettingsEqualToRaw,
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
    handleChannelInfo = ({channelInfos, prepareRecordsOnly = true}: HandleChannelInfoArgs): Promise<ChannelInfoModel[]> => {
        if (!channelInfos.length) {
            throw new DataOperatorException(
                'An empty "channelInfos" array has been passed to the handleMyChannelSettings method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: channelInfos,
            key: 'channel_id',
        });

        return this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordChannelInfoEqualToRaw,
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
    handleMyChannel = ({myChannels, prepareRecordsOnly = true}: HandleMyChannelArgs): Promise<MyChannelModel[]> => {
        if (!myChannels.length) {
            throw new DataOperatorException(
                'An empty "myChannels" array has been passed to the handleMyChannel method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: myChannels,
            key: 'channel_id',
        });

        return this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordMyChannelEqualToRaw,
            transformer: transformMyChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL,
        });
    };
};

export default ChannelHandler;
