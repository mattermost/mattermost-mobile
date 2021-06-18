// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/prepareRecords/index';
import App from '@typings/database/app';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    DataFactoryArgs,
    RawApp,
    RawCustomEmoji,
    RawGlobal,
    RawRole,
    RawServers,
    RawSystem,
    RawTermsOfService,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Global from '@typings/database/global';
import Role from '@typings/database/role';
import Servers from '@typings/database/servers';
import System from '@typings/database/system';
import TermsOfService from '@typings/database/terms_of_service';

const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;
const {
    CUSTOM_EMOJI,
    ROLE,
    SYSTEM,
    TERMS_OF_SERVICE,

} = MM_TABLES.SERVER;

/**
 * prepareAppRecord: Prepares record of entity 'App' from the DEFAULT database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareAppRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawApp;
    const record = value.record as App;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (app: App) => {
        app._raw.id = isCreateAction ? app.id : record.id;
        app.buildNumber = raw?.build_number;
        app.createdAt = raw?.created_at;
        app.versionNumber = raw?.version_number;
    };

    return prepareBaseRecord({
        action,
        database,
        generator,
        tableName: APP,
        value,
    });
};

/**
 * prepareGlobalRecord: Prepares record of entity 'Global' from the DEFAULT database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareGlobalRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawGlobal;
    const record = value.record as Global;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (global: Global) => {
        global._raw.id = isCreateAction ? global.id : record.id;
        global.name = raw?.name;
        global.value = raw?.value;
    };

    return prepareBaseRecord({
        action,
        database,
        generator,
        tableName: GLOBAL,
        value,
    });
};

/**
 * prepareServersRecord: Prepares record of entity 'Servers' from the DEFAULT database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareServersRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawServers;
    const record = value.record as Servers;
    const isCreateAction = action === OperationType.CREATE;

    const generator = (servers: Servers) => {
        servers._raw.id = isCreateAction ? servers.id : record.id;
        servers.dbPath = raw?.db_path;
        servers.displayName = raw?.display_name;
        servers.mentionCount = raw?.mention_count;
        servers.unreadCount = raw?.unread_count;
        servers.url = raw?.url;
        servers.isSecured = raw?.isSecured;
        servers.lastActiveAt = raw?.lastActiveAt;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: SERVERS,
        value,
        generator,
    });
};

/**
 * prepareCustomEmojiRecord: Prepares record of entity 'CustomEmoji' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareCustomEmojiRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawCustomEmoji;
    const record = value.record as CustomEmoji;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (emoji: CustomEmoji) => {
        emoji._raw.id = isCreateAction ? (raw?.id ?? emoji.id) : record.id;
        emoji.name = raw.name;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CUSTOM_EMOJI,
        value,
        generator,
    });
};

/**
 * prepareRoleRecord: Prepares record of entity 'Role' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareRoleRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawRole;
    const record = value.record as Role;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (role: Role) => {
        role._raw.id = isCreateAction ? (raw?.id ?? role.id) : record.id;
        role.name = raw?.name;
        role.permissions = raw?.permissions;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: ROLE,
        value,
        generator,
    });
};

/**
 * prepareSystemRecord: Prepares record of entity 'System' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareSystemRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawSystem;
    const record = value.record as System;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (system: System) => {
        system._raw.id = isCreateAction ? (raw?.id ?? system.id) : record.id;
        system.name = raw?.name;
        system.value = raw?.value;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: SYSTEM,
        value,
        generator,
    });
};

/**
 * prepareTermsOfServiceRecord: Prepares record of entity 'TermsOfService' from the SERVER database for update or create actions.
 * @param {DataFactoryArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const prepareTermsOfServiceRecord = ({action, database, value}: DataFactoryArgs) => {
    const raw = value.raw as RawTermsOfService;
    const record = value.record as TermsOfService;
    const isCreateAction = action === OperationType.CREATE;

    // If isCreateAction is true, we will use the id (API response) from the RAW, else we shall use the existing record id from the database
    const generator = (tos: TermsOfService) => {
        tos._raw.id = isCreateAction ? (raw?.id ?? tos.id) : record.id;
        tos.acceptedAt = raw?.accepted_at;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: TERMS_OF_SERVICE,
        value,
        generator,
    });
};
