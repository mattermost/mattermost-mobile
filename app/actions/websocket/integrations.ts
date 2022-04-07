// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import IntegrationsManager from '@init/integrations_manager';

export function handleOpenDialogEvent(serverUrl: string, msg: WebSocketMessage) {
    const data: string = msg.data?.dialog;
    if (!data) {
        return;
    }
    try {
        const dialog: InteractiveDialogConfig = JSON.parse(data);
        IntegrationsManager.getManager(serverUrl).setDialog(dialog);
    } catch {
        // Do nothing
    }
}
