// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import IntegrationsManager from '@managers/integrations_manager';
import {getActiveServerUrl} from '@queries/app/servers';

export async function handleOpenDialogEvent(serverUrl: string, msg: WebSocketMessage) {
    const data: string = msg.data?.dialog;
    if (!data) {
        return;
    }

    try {
        const dialog: InteractiveDialogConfig = JSON.parse(data);
        const currentServer = await getActiveServerUrl();
        if (currentServer === serverUrl) {
            IntegrationsManager.getManager(serverUrl).setDialog(dialog);
        }
    } catch {
        // Do nothing
    }
}
