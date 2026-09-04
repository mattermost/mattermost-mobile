// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setPlaybooksTaskRequirementsEnabled} from '@playbooks/actions/local/settings';
import {updatePlaybooksSettings} from '@playbooks/actions/remote/settings';
import {getFullErrorMessage} from '@utils/errors';
import {safeParseJSON} from '@utils/helpers';
import {logDebug} from '@utils/log';

export async function handlePlaybooksSettingsChanged(serverUrl: string, msg: WebSocketMessage) {
    const payload = msg.data?.payload;
    if (!payload) {
        logDebug('handlePlaybooksSettingsChanged: missing payload');
        return;
    }

    const settingsUpdate = typeof payload === 'string' ? safeParseJSON(payload) : payload;
    if (!settingsUpdate || typeof settingsUpdate !== 'object' || Array.isArray(settingsUpdate)) {
        logDebug('handlePlaybooksSettingsChanged: invalid settings payload');
        return;
    }

    if ('enable_task_requirements' in settingsUpdate) {
        const {error} = await setPlaybooksTaskRequirementsEnabled(
            serverUrl,
            Boolean((settingsUpdate as PlaybooksGlobalSettings).enable_task_requirements),
        );
        if (error) {
            logDebug('handlePlaybooksSettingsChanged: failed to persist settings', getFullErrorMessage(error));
        }
        return;
    }

    // Fallback when only a partial unrelated settings update arrived.
    const {error} = await updatePlaybooksSettings(serverUrl);
    if (error) {
        logDebug('handlePlaybooksSettingsChanged: failed to refresh settings', getFullErrorMessage(error));
    }
}
