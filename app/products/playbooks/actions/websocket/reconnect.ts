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
    await updatePlaybooksVersion(serverUrl);

    if (NavigationStore.getScreensInStack().includes(Screens.CHANNEL)) {
        const isPlaybooksEnabled = await fetchIsPlaybooksEnabled(database);
        if (isPlaybooksEnabled) {
            const currentChannelId = await getCurrentChannelId(database);
            await fetchPlaybookRunsForChannel(serverUrl, currentChannelId);
        }
    }
}
