// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDmGmDisplayName} from '@actions/local/channel';
import {storeConfig} from '@actions/local/systems';
import {fetchCategories} from '@actions/remote/category';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getConfig, getCurrentTeamId, getLicense} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';

export async function handleLicenseChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const license = msg.data.license;
        const systems: IdValue[] = [{id: SYSTEM_IDENTIFIERS.LICENSE, value: JSON.stringify(license)}];

        const prevLicense = await getLicense(database);
        await operator.handleSystem({systems, prepareRecordsOnly: false});

        if (license?.LockTeammateNameDisplay && (prevLicense?.LockTeammateNameDisplay !== license.LockTeammateNameDisplay)) {
            updateDmGmDisplayName(serverUrl);
        }
    } catch {
        // do nothing
    }
}

export async function handleConfigChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const config = msg.data.config;
        const prevConfig = await getConfig(database);
        await storeConfig(serverUrl, config);
        if (config?.LockTeammateNameDisplay && (prevConfig?.LockTeammateNameDisplay !== config.LockTeammateNameDisplay)) {
            updateDmGmDisplayName(serverUrl);
        }
        const prevManagedSetting = prevConfig?.EnableManagedChannelCategories;
        const newManagedSetting = config?.EnableManagedChannelCategories;
        if (newManagedSetting !== prevManagedSetting) {
            EphemeralStore.clearManagedCategoryPropertyIds(serverUrl);
            const currentTeamId = await getCurrentTeamId(database);
            if (currentTeamId) {
                await fetchCategories(serverUrl, currentTeamId, true);
            }
        }
    } catch {
        // do nothing
    }
}

