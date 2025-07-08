// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {extractChannelDisplayName} from '@helpers/database';

import type {TransformerArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_BOOKMARK,
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
export const transformChannelRecord = ({action, database, value}: TransformerArgs<ChannelModel, Channel>): Promise<ChannelModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (channel: ChannelModel) => {
        channel._raw.id = isCreateAction ? (raw?.id ?? channel.id) : record!.id;
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
        channel.bannerInfo = raw.banner_info;
        channel.abacPolicyEnforced = Boolean(raw.policy_enforced);
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
 * @returns {Promise<MyChannelSettingsModel>}
 */
export const transformMyChannelSettingsRecord = ({action, database, value}: TransformerArgs<MyChannelSettingsModel, ChannelMembership>): Promise<MyChannelSettingsModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (myChannelSetting: MyChannelSettingsModel) => {
        myChannelSetting._raw.id = isCreateAction ? (raw.channel_id || myChannelSetting.id) : record!.id;
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
 * @returns {Promise<ChannelInfoModel>}
 */
export const transformChannelInfoRecord = ({action, database, value}: TransformerArgs<ChannelInfoModel, ChannelInfo>): Promise<ChannelInfoModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (channelInfo: ChannelInfoModel) => {
        channelInfo._raw.id = isCreateAction ? (raw.id || channelInfo.id) : record!.id;
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
    });
};

/**
 * transformMyChannelRecord: Prepares a record of the SERVER database 'MyChannel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<MyChannelModel>}
 */
export const transformMyChannelRecord = async ({action, database, value}: TransformerArgs<MyChannelModel, ChannelMembership>): Promise<MyChannelModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (myChannel: MyChannelModel) => {
        myChannel._raw.id = isCreateAction ? (raw.channel_id || myChannel.id) : record!.id;
        myChannel.roles = raw.roles;

        // ignoring msg_count_root because msg_count, mention_count, last_post_at is already calculated in "handleMyChannel" based on CRT is enabled or not
        myChannel.messageCount = raw.msg_count;
        myChannel.mentionsCount = raw.mention_count;
        myChannel.lastPostAt = raw.last_post_at || 0;

        myChannel.isUnread = Boolean(raw.is_unread);
        myChannel.lastViewedAt = raw.last_viewed_at;
        myChannel.viewedAt = record?.viewedAt || 0;
        myChannel.lastFetchedAt = record?.lastFetchedAt || 0;
        myChannel.lastPlaybookRunsFetchAt = record?.lastPlaybookRunsFetchAt || 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: MY_CHANNEL,
        value,
        fieldsMapper,
    });
};

/**
 * transformChannelMembershipRecord: Prepares a record of the SERVER database 'ChannelMembership' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ChannelMembershipModel>}
 */
export const transformChannelMembershipRecord = ({action, database, value}: TransformerArgs<ChannelMembershipModel, ChannelMembership>): Promise<ChannelMembershipModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (channelMember: ChannelMembershipModel) => {
        channelMember._raw.id = isCreateAction ? (raw?.id ?? channelMember.id) : record!.id;
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
    });
};

/**
 * transformChannelBookmarkRecord: Prepares a record of the SERVER database 'Channel' table for update or create actions.
 * @param {DataFactory} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ChannelBookmarkModel>}
 */
export const transformChannelBookmarkRecord = ({action, database, value}: TransformerArgs<ChannelBookmarkModel, ChannelBookmark>): Promise<ChannelBookmarkModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (bookmark: ChannelBookmarkModel) => {
        bookmark._raw.id = isCreateAction ? (raw?.id ?? bookmark.id) : record!.id;
        bookmark.createAt = raw.create_at;
        bookmark.deleteAt = raw.delete_at;
        bookmark.updateAt = raw.update_at;
        bookmark.channelId = raw.channel_id;
        bookmark.ownerId = raw.owner_id;
        bookmark.fileId = raw.file_id;

        bookmark.displayName = raw.display_name;
        bookmark.sortOrder = raw.sort_order;
        bookmark.linkUrl = raw.link_url;
        bookmark.imageUrl = raw.image_url;
        bookmark.emoji = raw.emoji;
        bookmark.type = raw.type;
        bookmark.originalId = raw.original_id;
        bookmark.parentId = raw.parent_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_BOOKMARK,
        value,
        fieldsMapper,
    });
};
