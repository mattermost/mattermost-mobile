// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type {TransformerArgs} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type UserModel from '@typings/database/models/servers/user';

const {
    CHANNEL_MEMBERSHIP,
    PREFERENCE,
    REACTION,
    USER,
} = MM_TABLES.SERVER;

/**
 * transformReactionRecord: Prepares a record of the SERVER database 'Reaction' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ReactionModel>}
 */
export const transformReactionRecord = ({action, database, value}: TransformerArgs): Promise<ReactionModel> => {
    const raw = value.raw as Reaction;
    const record = value.record as ReactionModel;
    const isCreateAction = action === OperationType.CREATE;

    // id of reaction comes from server response
    const fieldsMapper = (reaction: ReactionModel) => {
        reaction._raw.id = isCreateAction ? (raw?.id ?? reaction.id) : record.id;
        reaction.userId = raw.user_id;
        reaction.postId = raw.post_id;
        reaction.emojiName = raw.emoji_name;
        reaction.createAt = raw.create_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: REACTION,
        value,
        fieldsMapper,
    }) as Promise<ReactionModel>;
};

/**
 * transformUserRecord: Prepares a record of the SERVER database 'User' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<UserModel>}
 */
export const transformUserRecord = ({action, database, value}: TransformerArgs): Promise<UserModel> => {
    const raw = value.raw as UserProfile;
    const record = value.record as UserModel;
    const isCreateAction = action === OperationType.CREATE;

    // id of user comes from server response
    const fieldsMapper = (user: UserModel) => {
        user._raw.id = isCreateAction ? (raw?.id ?? user.id) : record.id;
        user.authService = raw.auth_service;
        user.deleteAt = raw.delete_at;
        user.updateAt = raw.update_at;
        user.email = raw.email;
        user.firstName = raw.first_name;
        user.isGuest = raw.roles.includes('system_guest');
        user.lastName = raw.last_name;
        user.lastPictureUpdate = raw.last_picture_update;
        user.locale = raw.locale;
        user.nickname = raw.nickname;
        user.position = raw?.position ?? '';
        user.roles = raw.roles;
        user.username = raw.username;
        user.notifyProps = raw.notify_props;
        user.props = raw.props || null;
        user.timezone = raw.timezone || null;
        user.isBot = raw.is_bot;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: USER,
        value,
        fieldsMapper,
    }) as Promise<UserModel>;
};

/**
 * transformPreferenceRecord: Prepares a record of the SERVER database 'Preference' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<PreferenceModel>}
 */
export const transformPreferenceRecord = ({action, database, value}: TransformerArgs): Promise<PreferenceModel> => {
    const raw = value.raw as PreferenceType;
    const record = value.record as PreferenceModel;
    const isCreateAction = action === OperationType.CREATE;

    // id of preference comes from server response
    const fieldsMapper = (preference: PreferenceModel) => {
        preference._raw.id = isCreateAction ? preference.id : record.id;
        preference.category = raw.category;
        preference.name = raw.name;
        preference.userId = raw.user_id;
        preference.value = raw.value;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PREFERENCE,
        value,
        fieldsMapper,
    }) as Promise<PreferenceModel>;
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
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_MEMBERSHIP,
        value,
        fieldsMapper,
    }) as Promise<ChannelMembershipModel>;
};
