// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import App from '@typings/database/app';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    DataFactory,
    RawApp,
    RawCustomEmoji,
    RawGlobal,
    RawRole,
    RawServers,
    RawSystem,
    RawTermsOfService,
} from '@typings/database/database';
import Global from '@typings/database/global';
import Role from '@typings/database/role';
import Servers from '@typings/database/servers';
import System from '@typings/database/system';
import TermsOfService from '@typings/database/terms_of_service';

import {OperationType} from './index';

// TODO :  complete jsdocs for all functions

/**
 * operateAppRecord : Manufactures records ready for update/create of entity 'App' from the 'Default' database
 * @param {} db
 * @param {OperationType} optType
 * @param {string} tableName
 * @param {RecordValue} value
 * @returns {Promise<any>}
 */
export const operateAppRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawApp;

    const generator = (app: App) => {
        app._raw.id = record?.id ?? app.id;
        app.buildNumber = record?.buildNumber ?? '';
        app.createdAt = record?.createdAt ?? 0;
        app.versionNumber = record?.versionNumber ?? '';
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

export const operateGlobalRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawGlobal;

    const generator = (global: Global) => {
        global._raw.id = record?.id ?? global.id;
        global.name = record?.name ?? '';
        global.value = record?.value ?? 0;
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

export const operateServersRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawServers;

    const generator = (servers: Servers) => {
        servers._raw.id = record?.id ?? servers.id;
        servers.dbPath = record?.dbPath ?? '';
        servers.displayName = record?.displayName ?? 0;
        servers.mentionCount = record?.mentionCount ?? 0;
        servers.unreadCount = record?.unreadCount ?? 0;
        servers.url = record?.url ?? 0;
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

export const operateCustomEmojiRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawCustomEmoji;

    const generator = (emoji: CustomEmoji) => {
        emoji._raw.id = record?.id ?? emoji.id;
        emoji.name = record?.name ?? '';
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

export const operateRoleRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawRole;

    const generator = (role: Role) => {
        role._raw.id = record?.id ?? role.id;
        role.name = record?.name ?? '';
        role.permissions = record?.permissions ?? [];
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

export const operateSystemRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawSystem;

    const generator = (system: System) => {
        system._raw.id = record?.id ?? system.id;
        system.name = record?.name ?? '';
        system.value = record?.value ?? '';
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

export const operateTermsOfServiceRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const record = value as RawTermsOfService;

    const generator = (tos: TermsOfService) => {
        tos._raw.id = record?.id ?? tos.id;
        tos.acceptedAt = record?.acceptedAt ?? 0;
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

/**
 * operateBaseRecord :  The 'id' of a record is key to this function. Please note that if WatermelonDB encounters
 * an existing record during a CREATE operation, it silently fails the operation.
 *
 * In our case, if we have an existing 'id', then we'll update the record with the data.  For an UPDATE operation,
 * we fetch the existing record using the passed 'id' and then we do the update operation; if no record is found for that
 * 'id', we'll create it.
 *
 * For a delete operation, we'll use the id of the Model to fetch & delete its records from the database.
 *
 * @param {} db
 * @param {OperationType | undefined} optType
 * @param {string} tableName
 * @param {any} value
 * @param {((model: Model) => void)} generator
 * @returns {Promise<any>}
 */
const operateBaseRecord = async ({db, optType, tableName, value, generator}: DataFactory) => {
    // We query first to see if we have a record on that entity with the current value.id
    const appRecord = await db.collections.get(tableName).query(Q.where('id', value.id)).fetch() as Model[];
    const isPresent = appRecord.length > 0;

    if ((isPresent && optType === OperationType.CREATE) || (isPresent && optType === OperationType.UPDATE)) {
        // Two possible scenarios:
        // 1. We are dealing with either duplicates here and if so, we'll update instead of create
        // 2. This is just a normal update operation
        const record = appRecord[0];
        return record.prepareUpdate(() => generator!(record));
    }

    if ((!isPresent && optType === OperationType.UPDATE) || (optType === OperationType.CREATE)) {
        // Two possible scenarios
        // 1. We don't have a record yet to update; so we create it
        // 2. This is just a normal create operation
        return db.collections.get(tableName).prepareCreate(generator);
    }

    // TODO : do delete case

    return null;
};
