// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {updatePlaybooksVersion} from '@playbooks/actions/remote/version';
import {fetchIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {getCurrentChannelId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {logDebug} from '@utils/log';

export async function handlePlaybookReconnect(serverUrl: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    // Clear playbooks synced state on reconnect.
    // This is done to avoid clearing it on spotty connections
    // with reliable websockets.
    EphemeralStore.clearChannelPlaybooksSynced(serverUrl);

    // Set the version of the playbooks plugin to the systems table
    const updateResult = await updatePlaybooksVersion(serverUrl);
    if (updateResult.error) {
        logDebug('Error updating playbooks version on reconnect', updateResult.error);
    }

    if (NavigationStore.getScreensInStack().includes(Screens.CHANNEL)) {
        const isPlaybooksEnabled = await fetchIsPlaybooksEnabled(database);
        if (isPlaybooksEnabled) {
            const currentChannelId = await getCurrentChannelId(database);
            const fetchResult = await fetchPlaybookRunsForChannel(serverUrl, currentChannelId);
            if (fetchResult.error) {
                logDebug('Error fetching playbook runs on reconnect', fetchResult.error);
            }
        }
    }
}
