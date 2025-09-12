// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {
    setChecklistItemCommand as localSetChecklistItemCommand,
    updateChecklistItem as localUpdateChecklistItem,
    setAssignee as localSetAssignee,
    setDueDate as localSetDueDate,
} from '@playbooks/actions/local/checklist';
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

        await client.setChecklistItemState(playbookRunId, checklistNumber, itemNumber, state);
        await localUpdateChecklistItem(serverUrl, itemId, state);
        return {data: true};
    } catch (error) {
        logDebug('error on updateChecklistItem', getFullErrorMessage(error));
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
        const {trigger_id} = await client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber);
        if (trigger_id) {
            IntegrationsManager.getManager(serverUrl)?.setTriggerId(trigger_id);
        }
        return {data: true};
    } catch (error) {
        logDebug('error on runChecklistItem', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const skipChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.skipChecklistItem(playbookRunId, checklistNumber, itemNumber);

        await localUpdateChecklistItem(serverUrl, itemId, 'skipped');
        return {data: true};
    } catch (error) {
        logDebug('error on skipChecklistItem', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const restoreChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.restoreChecklistItem(playbookRunId, checklistNumber, itemNumber);

        await localUpdateChecklistItem(serverUrl, itemId, '');
        return {data: true};
    } catch (error) {
        logDebug('error on restoreChecklistItem', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const setChecklistItemCommand = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
    command: string,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.setChecklistItemCommand(playbookRunId, checklistNumber, itemNumber, command);

        await localSetChecklistItemCommand(serverUrl, itemId, command);
        return {data: true};
    } catch (error) {
        logDebug('error on setChecklistItemCommand', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const setAssignee = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
    assigneeId: string,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.setAssignee(playbookRunId, checklistNumber, itemNumber, assigneeId);

        await localSetAssignee(serverUrl, itemId, assigneeId);
        return {data: true};
    } catch (error) {
        logDebug('error on setAssignee', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const setDueDate = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
    date?: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.setDueDate(playbookRunId, checklistNumber, itemNumber, date);

        await localSetDueDate(serverUrl, itemId, date);
        return {data: true};
    } catch (error) {
        logDebug('error on setDueDate', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
