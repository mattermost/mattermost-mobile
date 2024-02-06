// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {extractChannelDisplayName} from '@helpers/database';

import type {TransformerArgs} from '@typings/database/database';
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

/**
 * transformChannelRecord: Prepares a record of the SERVER database 'Channel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ChannelModel>}
 */
export const transformChannelRecord = ({action, database, value}: TransformerArgs): Promise<ChannelModel> => {
    const raw = value.raw as Channel;
    const record = value.record as ChannelModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (channel: ChannelModel) => {
        channel._raw.id = isCreateAction ? (raw?.id ?? channel.id) : record.id;
        channel.createAt = raw.create_at;
        channel.creatorId = raw.creator_id;
        channel.deleteAt = raw.delete_at;
        channel.updateAt = raw.update_at;

        channel.displayName = extractChannelDisplayName(raw, record);
        channel.isGroupConstrained = Boolean(raw.group_constrained);
        channel.name = raw.name;
        channel.shared = Boolean(raw.shared);
        channel.teamId = raw.team_id;
        channel.type = raw.type;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL,
        value,
        fieldsMapper,
    }) as Promise<ChannelModel>;
};

/**
 * transformMyChannelSettingsRecord: Prepares a record of the SERVER database 'MyChannelSettings' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<MyChannelSettingsModel>}
 */
export const transformMyChannelSettingsRecord = ({action, database, value}: TransformerArgs): Promise<MyChannelSettingsModel> => {
    const raw = value.raw as ChannelMembership;
    const record = value.record as MyChannelSettingsModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (myChannelSetting: MyChannelSettingsModel) => {
        myChannelSetting._raw.id = isCreateAction ? (raw.channel_id || myChannelSetting.id) : record.id;
        myChannelSetting.notifyProps = raw.notify_props;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_CHANNEL_SETTINGS,
        value,
        fieldsMapper,
    }) as Promise<MyChannelSettingsModel>;
};

/**
 * transformChannelInfoRecord: Prepares a record of the SERVER database 'ChannelInfo' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ChannelInfoModel>}
 */
export const transformChannelInfoRecord = ({action, database, value}: TransformerArgs): Promise<ChannelInfoModel> => {
    const raw = value.raw as Partial<ChannelInfo>;
    const record = value.record as ChannelInfoModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (channelInfo: ChannelInfoModel) => {
        channelInfo._raw.id = isCreateAction ? (raw.id || channelInfo.id) : record.id;
        channelInfo.guestCount = raw.guest_count ?? channelInfo.guestCount ?? 0;
        channelInfo.header = raw.header ?? channelInfo.header ?? '';
        channelInfo.memberCount = raw.member_count ?? channelInfo.memberCount ?? 0;
        channelInfo.pinnedPostCount = raw.pinned_post_count ?? channelInfo.pinnedPostCount ?? 0;
        channelInfo.filesCount = raw.files_count ?? channelInfo.filesCount ?? 0;
        channelInfo.purpose = raw.purpose ?? channelInfo.purpose ?? '';
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_INFO,
        value,
        fieldsMapper,
    }) as Promise<ChannelInfoModel>;
};

/**
 * transformMyChannelRecord: Prepares a record of the SERVER database 'MyChannel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<MyChannelModel>}
 */
export const transformMyChannelRecord = async ({action, database, value}: TransformerArgs): Promise<MyChannelModel> => {
    const raw = value.raw as ChannelMembership;
    const record = value.record as MyChannelModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (myChannel: MyChannelModel) => {
        myChannel._raw.id = isCreateAction ? (raw.channel_id || myChannel.id) : record.id;
        myChannel.roles = raw.roles;

        // ignoring msg_count_root because msg_count, mention_count, last_post_at is already calculated in "handleMyChannel" based on CRT is enabled or not
        myChannel.messageCount = raw.msg_count;
        myChannel.mentionsCount = raw.mention_count;
        myChannel.lastPostAt = raw.last_post_at || 0;

        myChannel.isUnread = Boolean(raw.is_unread);
        myChannel.lastViewedAt = raw.last_viewed_at;
        myChannel.viewedAt = record?.viewedAt || 0;
        myChannel.lastFetchedAt = record?.lastFetchedAt || 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_CHANNEL,
        value,
        fieldsMapper,
    }) as Promise<MyChannelModel>;
};

/**
 * transformChannelMembershipRecord: Prepares a record of the SERVER database 'ChannelMembership' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ChannelMembershipModel>}
 */
export const transformChannelMembershipRecord = ({action, database, value}: TransformerArgs): Promise<ChannelMembershipModel> => {
    const raw = value.raw as ChannelMembership;
    const record = value.record as ChannelMembershipModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (channelMember: ChannelMembershipModel) => {
        channelMember._raw.id = isCreateAction ? (raw?.id ?? channelMember.id) : record.id;
        channelMember.channelId = raw.channel_id;
        channelMember.userId = raw.user_id;
        channelMember.schemeAdmin = raw.scheme_admin ?? false;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_MEMBERSHIP,
        value,
        fieldsMapper,
    }) as Promise<ChannelMembershipModel>;
};
