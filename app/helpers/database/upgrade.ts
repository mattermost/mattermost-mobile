// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getLastInstalledVersion} from '@queries/app/info';
import {logError, logInfo} from '@utils/log';

import type {DatabaseManager} from '@typings/database/manager';
import type InfoModel from '@typings/database/models/app/info';

export async function beforeUpgrade(serverUrls: string[], versionNumber: string, buildNumber: string) {
    const info = await getLastInstalledVersion();
    const manager: DatabaseManager | undefined = this.serverDatabases ? this : undefined;
    if (manager && serverUrls.length && info && (versionNumber !== info.versionNumber || buildNumber !== info.buildNumber)) {
        await beforeUpgradeTo450(manager, serverUrls, info);
    }
}

async function beforeUpgradeTo450(manager: DatabaseManager, serverUrls: string[], info: InfoModel) {
    try {
        const buildNumber = parseInt(info.buildNumber, 10);
        if (info.versionNumber === '2.0.0' && buildNumber < 450) {
            for await (const serverUrl of serverUrls) {
                logInfo('Remove database before upgrading for', serverUrl);
                await manager.deleteServerDatabaseFiles(serverUrl);
            }
        }
    } catch (e) {
        logError('Error running the upgrade before build 450', e);
    }
}
