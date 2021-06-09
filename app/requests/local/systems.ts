// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {Operator} from '@database/operator';
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
    const {activeServerDatabase, error} = await getActiveServerDatabase();
    if (!activeServerDatabase) {
        return {error};
    }

    const database = activeServerDatabase as Database;

    await database.action(async () => {
        await configRecord.update((config) => {
            config.value = {...configRecord.value, lastUpdateCheck: Date.now()};
        });
    });

    return null;
};

export const handleServerUrlChanged = async ({configRecord, licenseRecord, selectServerRecord, serverUrl}: ServerUrlChangedArgs) => {
    const {activeServerDatabase, error} = await getActiveServerDatabase();
    if (!activeServerDatabase) {
        return {error};
    }
    const database = activeServerDatabase as Database;
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
    await DataOperator.handleIsolatedEntity({
        tableName: IsolatedEntities.SYSTEM,
        values: [{

            // id: string; // todo: to confirm value for session id ?
            name: 'sessions',
            value: sessions,
        }],
        prepareRecordsOnly: false,
    });
};
