// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import ChannelMembership from '@typings/database/models/servers/channel_membership';
import {TransformerArgs, RawChannelMembership, RawPreference, RawReaction, RawUser} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Preference from '@typings/database/models/servers/preference';
import Reaction from '@typings/database/models/servers/reaction';
import User from '@typings/database/models/servers/user';

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
 * @returns {Promise<Model>}
 */
export const transformReactionRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawReaction;
    const record = value.record as Reaction;
    const isCreateAction = action === OperationType.CREATE;

    // id of reaction comes from server response
    const fieldsMapper = (reaction: Reaction) => {
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
    });
};

/**
 * transformUserRecord: Prepares a record of the SERVER database 'User' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformUserRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawUser;
    const record = value.record as User;
    const isCreateAction = action === OperationType.CREATE;

    // id of user comes from server response
    const fieldsMapper = (user: User) => {
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
        user.props = raw.props;
        user.timezone = raw.timezone;
        user.isBot = raw.is_bot;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: USER,
        value,
        fieldsMapper,
    });
};

/**
 * transformPreferenceRecord: Prepares a record of the SERVER database 'Preference' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformPreferenceRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawPreference;
    const record = value.record as Preference;
    const isCreateAction = action === OperationType.CREATE;

    // id of preference comes from server response
    const fieldsMapper = (preference: Preference) => {
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
    });
};

/**
 * transformChannelMembershipRecord: Prepares a record of the SERVER database 'ChannelMembership' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformChannelMembershipRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawChannelMembership;
    const record = value.record as ChannelMembership;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (channelMember: ChannelMembership) => {
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
    });
};
