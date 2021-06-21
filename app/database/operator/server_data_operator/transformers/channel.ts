// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import Channel from '@typings/database/models/servers/channel';
import ChannelInfo from '@typings/database/models/servers/channel_info';
import {
    TransformerArgs,
    RawChannel,
    RawChannelInfo,
    RawMyChannel,
    RawMyChannelSettings,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import MyChannel from '@typings/database/models/servers/my_channel';
import MyChannelSettings from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_INFO,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

/**
 * transformChannelRecord: Prepares a record of the SERVER database 'Channel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformChannelRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawChannel;
    const record = value.record as Channel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (channel: Channel) => {
        channel._raw.id = isCreateAction ? (raw?.id ?? channel.id) : record.id;
        channel.createAt = raw.create_at;
        channel.creatorId = raw.creator_id;
        channel.deleteAt = raw.delete_at;
        channel.displayName = raw.display_name;
        channel.isGroupConstrained = Boolean(raw.group_constrained);
        channel.name = raw.name;
        channel.teamId = raw.team_id;
        channel.type = raw.type;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL,
        value,
        fieldsMapper,
    });
};

/**
 * transformMyChannelSettingsRecord: Prepares a record of the SERVER database 'MyChannelSettings' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformMyChannelSettingsRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawMyChannelSettings;
    const record = value.record as MyChannelSettings;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (myChannelSetting: MyChannelSettings) => {
        myChannelSetting._raw.id = isCreateAction ? myChannelSetting.id : record.id;
        myChannelSetting.channelId = raw.channel_id;
        myChannelSetting.notifyProps = raw.notify_props;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_CHANNEL_SETTINGS,
        value,
        fieldsMapper,
    });
};

/**
 * transformChannelInfoRecord: Prepares a record of the SERVER database 'ChannelInfo' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformChannelInfoRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawChannelInfo;
    const record = value.record as ChannelInfo;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (channelInfo: ChannelInfo) => {
        channelInfo._raw.id = isCreateAction ? channelInfo.id : record.id;
        channelInfo.channelId = raw.channel_id;
        channelInfo.guestCount = raw.guest_count;
        channelInfo.header = raw.header;
        channelInfo.memberCount = raw.member_count;
        channelInfo.pinnedPostCount = raw.pinned_post_count;
        channelInfo.purpose = raw.purpose;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_INFO,
        value,
        fieldsMapper,
    });
};

/**
 * transformMyChannelRecord: Prepares a record of the SERVER database 'MyChannel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformMyChannelRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawMyChannel;
    const record = value.record as MyChannel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (myChannel: MyChannel) => {
        myChannel._raw.id = isCreateAction ? myChannel.id : record.id;
        myChannel.channelId = raw.channel_id;
        myChannel.roles = raw.roles;
        myChannel.messageCount = raw.message_count;
        myChannel.mentionsCount = raw.mentions_count;
        myChannel.lastPostAt = raw.last_post_at;
        myChannel.lastViewedAt = raw.last_viewed_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_CHANNEL,
        value,
        fieldsMapper,
    });
};

