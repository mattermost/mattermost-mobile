// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import CustomEmoji from '@typings/database/models/servers/custom_emoji';
import {
    TransformerArgs,
    RawCustomEmoji,
    RawRole,
    RawSystem,
    RawTermsOfService,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Role from '@typings/database/models/servers/role';
import System from '@typings/database/models/servers/system';
import TermsOfService from '@typings/database/models/servers/terms_of_service';

const {
    CUSTOM_EMOJI,
    ROLE,
    SYSTEM,
    TERMS_OF_SERVICE,
} = MM_TABLES.SERVER;

/**
 * transformCustomEmojiRecord: Prepares a record of the SERVER database 'CustomEmoji' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformCustomEmojiRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawCustomEmoji;
    const record = value.record as CustomEmoji;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (emoji: CustomEmoji) => {
        emoji._raw.id = isCreateAction ? (raw?.id ?? emoji.id) : record.id;
        emoji.name = raw.name;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CUSTOM_EMOJI,
        value,
        fieldsMapper,
    });
};

/**
 * transformRoleRecord: Prepares a record of the SERVER database 'Role' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformRoleRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawRole;
    const record = value.record as Role;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (role: Role) => {
        role._raw.id = isCreateAction ? (raw?.id ?? role.id) : record.id;
        role.name = raw?.name;
        role.permissions = raw?.permissions;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: ROLE,
        value,
        fieldsMapper,
    });
};

/**
 * transformSystemRecord: Prepares a record of the SERVER database 'System' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformSystemRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawSystem;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (system: System) => {
        system.name = raw?.name;
        system.value = raw?.value;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: SYSTEM,
        value,
        fieldsMapper,
    });
};

/**
 * transformTermsOfServiceRecord: Prepares a record of the SERVER database 'TermsOfService' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformTermsOfServiceRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawTermsOfService;
    const record = value.record as TermsOfService;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (tos: TermsOfService) => {
        tos._raw.id = isCreateAction ? (raw?.id ?? tos.id) : record.id;
        tos.acceptedAt = raw?.accepted_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TERMS_OF_SERVICE,
        value,
        fieldsMapper,
    });
};
