// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/prepareRecords/index';
import ChannelMembership from '@typings/database/channel_membership';
import {DataFactoryArgs, RawChannelMembership, RawPreference, RawReaction, RawUser} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Preference from '@typings/database/preference';
import Reaction from '@typings/database/reaction';
import User from '@typings/database/user';

const {
    CHANNEL_MEMBERSHIP,
    PREFERENCE,
    REACTION,
    USER,
} = MM_TABLES.SERVER;

/**
 * prepareReactionRecord: Prepares record of entity 'REACTION' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareReactionRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawReaction;
    const record = value.record as Reaction;
    const isCreateAction = action === OperationType.CREATE;

    // id of reaction comes from server response
    const generator = (reaction: Reaction) => {
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
        generator,
    });
};

/**
 * prepareUserRecord: Prepares record of entity 'USER' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareUserRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawUser;
    const record = value.record as User;
    const isCreateAction = action === OperationType.CREATE;

    // id of user comes from server response
    const generator = (user: User) => {
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
        generator,
    });
};

/**
 * preparePreferenceRecord: Prepares record of entity 'PREFERENCE' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const preparePreferenceRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawPreference;
    const record = value.record as Preference;
    const isCreateAction = action === OperationType.CREATE;

    // id of preference comes from server response
    const generator = (preference: Preference) => {
        preference._raw.id = isCreateAction ? (raw?.id ?? preference.id) : record.id;
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
        generator,
    });
};

/**
 * prepareChannelMembershipRecord: Prepares record of entity 'CHANNEL_MEMBERSHIP' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareChannelMembershipRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawChannelMembership;
    const record = value.record as ChannelMembership;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (channelMember: ChannelMembership) => {
        channelMember._raw.id = isCreateAction ? (raw?.id ?? channelMember.id) : record.id;
        channelMember.channelId = raw.channel_id;
        channelMember.userId = raw.user_id;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CHANNEL_MEMBERSHIP,
        value,
        generator,
    });
};
