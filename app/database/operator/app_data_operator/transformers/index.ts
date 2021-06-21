// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers';
import Info from '@typings/database/models/app/info';
import {TransformerArgs, RawInfo, RawGlobal, RawServers} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import Global from '@typings/database/models/app/global';
import Servers from '@typings/database/models/app/servers';

const {INFO, GLOBAL, SERVERS} = MM_TABLES.APP;

/**
 * transformInfoRecord: Prepares a record of the APP database 'Info' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformInfoRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawInfo;
    const record = value.record as Info;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (app: Info) => {
        app._raw.id = isCreateAction ? app.id : record.id;
        app.buildNumber = raw?.build_number;
        app.createdAt = raw?.created_at;
        app.versionNumber = raw?.version_number;
    };

    return prepareBaseRecord({
        action,
        database,
        fieldsMapper,
        tableName: INFO,
        value,
    });
};

/**
 * transformGlobalRecord: Prepares a record of the APP database 'Global' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformGlobalRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawGlobal;
    const record = value.record as Global;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (global: Global) => {
        global._raw.id = isCreateAction ? global.id : record.id;
        global.name = raw?.name;
        global.value = raw?.value;
    };

    return prepareBaseRecord({
        action,
        database,
        fieldsMapper,
        tableName: GLOBAL,
        value,
    });
};

/**
 * transformServersRecord: Prepares a record of the APP database 'Servers' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformServersRecord = ({action, database, value}: TransformerArgs) => {
    const raw = value.raw as RawServers;
    const record = value.record as Servers;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (servers: Servers) => {
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
        fieldsMapper,
    });
};
