// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/prepareRecords/index';
import Channel from '@typings/database/channel';
import ChannelInfo from '@typings/database/channel_info';
import {
    DataFactoryArgs,
    RawChannel,
    RawChannelInfo,
    RawMyChannel,
    RawMyChannelSettings,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import MyChannel from '@typings/database/my_channel';
import MyChannelSettings from '@typings/database/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_INFO,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

/**
 * prepareChannelRecord: Prepares record of entity 'CHANNEL' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareChannelRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawChannel;
    const record = value.record as Channel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (channel: Channel) => {
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
        generator,
    });
};

/**
 * prepareMyChannelSettingsRecord: Prepares record of entity 'MY_CHANNEL_SETTINGS' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareMyChannelSettingsRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawMyChannelSettings;
    const record = value.record as MyChannelSettings;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (myChannelSetting: MyChannelSettings) => {
        myChannelSetting._raw.id = isCreateAction ? myChannelSetting.id : record.id;
        myChannelSetting.channelId = raw.channel_id;
        myChannelSetting.notifyProps = raw.notify_props;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_CHANNEL_SETTINGS,
        value,
        generator,
    });
};

/**
 * prepareChannelInfoRecord: Prepares record of entity 'CHANNEL_INFO' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareChannelInfoRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawChannelInfo;
    const record = value.record as ChannelInfo;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (channelInfo: ChannelInfo) => {
        channelInfo._raw.id = isCreateAction ? channelInfo.id : record.id;
        channelInfo.channelId = raw.channel_id;
        channelInfo.guestCount = raw.guest_count;
        channelInfo.header = raw.header;
        channelInfo.memberCount = raw.member_count;
        channelInfo.pinned_post_count = raw.pinned_post_count;
        channelInfo.purpose = raw.purpose;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_INFO,
        value,
        generator,
    });
};

/**
 * prepareMyChannelRecord: Prepares record of entity 'MY_CHANNEL' from the SERVER database for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareMyChannelRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawMyChannel;
    const record = value.record as MyChannel;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (myChannel: MyChannel) => {
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
        generator,
    });
};

