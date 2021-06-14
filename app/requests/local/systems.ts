// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Operator from '@database/operator';
import {ServerUrlChangedArgs} from '@typings/database/database';
import {IsolatedEntities} from '@typings/database/enums';
import System from '@typings/database/system';
import {getActiveServerDatabase} from '@utils/database';

/**
 * setLastUpgradeCheck: Takes in 'config' record from System entity and update its lastUpdateCheck to Date.now()
 * @param {System} configRecord
 * @returns {Promise<void>}
 */
export const setLastUpgradeCheck = async (configRecord: System) => {
    const {activeServerDatabase: database, error} = await getActiveServerDatabase();
    if (!database) {
        return {error};
    }

    await database.action(async () => {
        await configRecord.update((config) => {
            config.value = {...configRecord.value, lastUpdateCheck: Date.now()};
        });
    });

    return null;
};

export const handleServerUrlChanged = async ({configRecord, licenseRecord, selectServerRecord, serverUrl}: ServerUrlChangedArgs) => {
    const {activeServerDatabase: database, error} = await getActiveServerDatabase();
    if (!database) {
        return {error};
    }

    await database.action(async () => {
        await database.batch(
            ...[
                configRecord.prepareUpdate((config: System) => {
                    config.value = {};
                }),
                licenseRecord.prepareUpdate((license: System) => {
                    license.value = {};
                }),
                selectServerRecord.prepareUpdate((server: System) => {
                    server.value = {...server.value, serverUrl};
                }),
            ],
        );
    });

    return null;
};

export const createSessions = async (sessions: any) => {
    const {activeServerDatabase: database, error} = await getActiveServerDatabase();
    if (!database) {
        return {error};
    }
    const operator = new Operator(database);
    await operator.handleIsolatedEntity({
        tableName: IsolatedEntities.SYSTEM,
        values: [{

            // id: string; // todo: to confirm value for session id ?
            name: 'sessions',
            value: sessions,
        }],
        prepareRecordsOnly: false,
    });
    return null;
};

export const setDeepLinkUrl = async (url: string) => {
    const operator = new Operator();
    await operator.handleIsolatedEntity({
        tableName: IsolatedEntities.GLOBAL,
        values: [{
            name: 'deepLinkUrl',
            value: url,
        }],
        prepareRecordsOnly: false,
    });
};
