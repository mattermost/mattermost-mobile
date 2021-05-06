// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';

// See LICENSE.txt for license information.
import DatabaseManager from '@database/manager';
import System from '@typings/database/system';

/**
 * setLastUpgradeCheck: Takes in 'config' record from System entity and update its lastUpdateCheck to Date.now()
 * @param {System} configRecord
 * @returns {Promise<void>}
 */
export const setLastUpgradeCheck = async (configRecord: System) => {
    const database = DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException('DatabaseManager.getActiveServerDatabase returned undefined');
    }

    await database.action(async () => {
        await configRecord.update((config) => {
            config.value = {...configRecord.value, lastUpdateCheck: Date.now()};
        });
    });
};

type ServerUrlChangedArgs = {
  configRecord: System;
  licenseRecord: System;
  selectServerRecord: System;
  serverUrl: string;
};

export const handleServerUrlChanged = async ({
    configRecord,
    licenseRecord,
    selectServerRecord,
    serverUrl,
}: ServerUrlChangedArgs) => {
    const database = DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException('DatabaseManager.getActiveServerDatabase returned undefined');
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
};

export const createSessions = (sessions) => {
    const database = DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException('DatabaseManager.getActiveServerDatabase returned undefined');
    }

    //todo: save sessions under system entity
};
