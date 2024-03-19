// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {TransformerArgs} from '@typings/database/database';
import type ConfigModel from '@typings/database/models/servers/config';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type FileModel from '@typings/database/models/servers/file';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';

const {
    CUSTOM_EMOJI,
    FILE,
    ROLE,
    SYSTEM,
    CONFIG,
} = MM_TABLES.SERVER;

/**
 * transformCustomEmojiRecord: Prepares a record of the SERVER database 'CustomEmoji' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<CustomEmojiModel>}
 */
export const transformCustomEmojiRecord = ({action, database, value}: TransformerArgs): Promise<CustomEmojiModel> => {
    const raw = value.raw as CustomEmoji;
    const record = value.record as CustomEmojiModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (emoji: CustomEmojiModel) => {
        emoji._raw.id = isCreateAction ? (raw?.id ?? emoji.id) : record.id;
        emoji.name = raw.name;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CUSTOM_EMOJI,
        value,
        fieldsMapper,
    }) as Promise<CustomEmojiModel>;
};

/**
 * transformRoleRecord: Prepares a record of the SERVER database 'Role' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<RoleModel>}
 */
export const transformRoleRecord = ({action, database, value}: TransformerArgs): Promise<RoleModel> => {
    const raw = value.raw as Role;
    const record = value.record as RoleModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (role: RoleModel) => {
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
    }) as Promise<RoleModel>;
};

/**
 * transformSystemRecord: Prepares a record of the SERVER database 'System' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<SystemModel>}
 */
export const transformSystemRecord = ({action, database, value}: TransformerArgs): Promise<SystemModel> => {
    const raw = value.raw as IdValue;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (system: SystemModel) => {
        system._raw.id = raw?.id;
        system.value = raw?.value;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: SYSTEM,
        value,
        fieldsMapper,
    }) as Promise<SystemModel>;
};

/**
 * transformConfigRecord: Prepares a record of the SERVER database 'Config' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<ConfigModel>}
 */
export const transformConfigRecord = ({action, database, value}: TransformerArgs): Promise<ConfigModel> => {
    const raw = value.raw as IdValue;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (config: ConfigModel) => {
        config._raw.id = raw?.id;
        config.value = raw?.value as string;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CONFIG,
        value,
        fieldsMapper,
    }) as Promise<ConfigModel>;
};

/**
 * transformFileRecord: Prepares a record of the SERVER database 'Files' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<FileModel>}
 */
export const transformFileRecord = ({action, database, value}: TransformerArgs): Promise<FileModel> => {
    const raw = value.raw as FileInfo;
    const record = value.record as FileModel;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const fieldsMapper = (file: FileModel) => {
        file._raw.id = isCreateAction ? (raw.id || file.id) : record.id;
        file.postId = raw.post_id || '';
        file.name = raw.name;
        file.extension = raw.extension;
        file.size = raw.size;
        file.mimeType = raw?.mime_type ?? '';
        file.width = raw?.width || record?.width || 0;
        file.height = raw?.height || record?.height || 0;
        file.imageThumbnail = raw?.mini_preview || record?.imageThumbnail || '';
        file.localPath = raw?.localPath || record?.localPath || null;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: FILE,
        value,
        fieldsMapper,
    }) as Promise<FileModel>;
};
