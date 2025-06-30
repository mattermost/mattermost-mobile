// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {updateChecklistItem as localUpdateChecklistItem} from '@playbooks/actions/local/checklist';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const updateChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
    state: ChecklistItemState,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const res = await client.setChecklistItemState(playbookRunId, checklistNumber, itemNumber, state);
        if (res.error) {
            return {error: res.error};
        }
        await localUpdateChecklistItem(serverUrl, itemId, state);
        return {data: true};
    } catch (error) {
        logDebug('error on fetchPlaybookRunsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const runChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    checklistNumber: number,
    itemNumber: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber);
        return {data: true};
    } catch (error) {
        logDebug('error on runChecklistItem', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
