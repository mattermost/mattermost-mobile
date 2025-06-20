// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {TransformerArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type UserModel from '@typings/database/models/servers/user';

const {PREFERENCE, USER} = MM_TABLES.SERVER;

/**
 * transformUserRecord: Prepares a record of the SERVER database 'User' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<UserModel>}
 */
export const transformUserRecord = ({action, database, value}: TransformerArgs<UserModel, UserProfile>): Promise<UserModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;

    // id of user comes from server response
    const fieldsMapper = (user: UserModel) => {
        user._raw.id = isCreateAction ? (raw?.id ?? user.id) : record?.id || '';
        user.authService = raw.auth_service;
        user.deleteAt = raw.delete_at;
        user.updateAt = raw.update_at;
        user.email = raw.email;
        user.firstName = raw.first_name;
        user.isGuest = raw.roles.includes('system_guest');
        user.lastName = raw.last_name;
        user.lastPictureUpdate = raw.last_picture_update || 0;
        user.locale = raw.locale;
        user.nickname = raw.nickname;
        user.position = raw?.position ?? '';
        user.roles = raw.roles;
        user.username = raw.username;
        user.notifyProps = raw.notify_props;
        user.timezone = raw.timezone || null;
        user.isBot = raw.is_bot ?? false;
        user.remoteId = raw?.remote_id ?? null;
        user.termsOfServiceId = raw?.terms_of_service_id ?? (record?.termsOfServiceId || '');
        user.termsOfServiceCreateAt = raw?.terms_of_service_create_at ?? (record?.termsOfServiceCreateAt || 0);
        if (raw.status) {
            user.status = raw.status;
        }

        if (raw.bot_description) {
            raw.props = {
                ...raw.props,
                bot_description: raw.bot_description,
            };
        }

        if (raw.bot_last_icon_update) {
            raw.props = {
                ...raw.props,
                bot_last_icon_update: raw.bot_last_icon_update,
            };
        }

        user.props = raw.props || null;
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
 * @returns {Promise<PreferenceModel>}
 */
export const transformPreferenceRecord = ({action, database, value}: TransformerArgs<PreferenceModel, PreferenceType>): Promise<PreferenceModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;

    // id of preference comes from server response
    const fieldsMapper = (preference: PreferenceModel) => {
        preference._raw.id = isCreateAction ? preference.id : record?.id || '';
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

