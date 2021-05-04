// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
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

    if (database) {
        await database.action(async () => {
            await configRecord.update((config) => {
                config.value = {...configRecord.value, lastUpdateCheck: Date.now()};
            });
        });
    }
};
