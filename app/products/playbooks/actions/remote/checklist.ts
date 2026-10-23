// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {
    setChecklistItemCommand as localSetChecklistItemCommand,
    setAssignee as localSetAssignee,
    setDueDate as localSetDueDate,
    renameChecklist as localRenameChecklist,
    deleteChecklistItem as localDeleteChecklistItem,
    updateChecklistItemTitleAndDescription as localUpdateChecklistItemTitleAndDescription,
} from '@playbooks/actions/local/checklist';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {fetchPlaybookRun} from '@playbooks/actions/remote/runs';
import {applyPlaybookRunDelta} from '@playbooks/actions/websocket/runs';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

const applyTaskMutationResponse = async (serverUrl: string, runId: string, response: PlaybookRunUpdate | void) => {
    if (response && response.id === runId && response.task_activity_sync && response.changed_fields) {
        await applyPlaybookRunDelta(serverUrl, response, true);
        return;
    }
    const result = await fetchPlaybookRun(serverUrl, runId);
    if (result.error) {
        throw result.error;
    }
};

export const updateChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    _itemId: string,
    checklistNumber: number,
    itemNumber: number,
    state: ChecklistItemState,
    requirementValues?: Record<string, string>,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const response = await client.setChecklistItemState(playbookRunId, checklistNumber, itemNumber, state, requirementValues);
        await applyTaskMutationResponse(serverUrl, playbookRunId, response);
        return {data: true};
    } catch (error) {
        logDebug('error on updateChecklistItem', getFullErrorMessage(error));
        await fetchPlaybookRun(serverUrl, playbookRunId);
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
    _itemId: string,
    checklistNumber: number,
    itemNumber: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.skipChecklistItem(playbookRunId, checklistNumber, itemNumber);
        await applyTaskMutationResponse(serverUrl, playbookRunId, response);
        return {data: true};
    } catch (error) {
        logDebug('error on skipChecklistItem', getFullErrorMessage(error));
        await fetchPlaybookRun(serverUrl, playbookRunId);
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const restoreChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    _itemId: string,
    checklistNumber: number,
    itemNumber: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.restoreChecklistItem(playbookRunId, checklistNumber, itemNumber);
        await applyTaskMutationResponse(serverUrl, playbookRunId, response);
        return {data: true};
    } catch (error) {
        logDebug('error on restoreChecklistItem', getFullErrorMessage(error));
        await fetchPlaybookRun(serverUrl, playbookRunId);
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

export const renameChecklist = async (
    serverUrl: string,
    playbookRunId: string,
    checklistNumber: number,
    checklistId: string,
    newTitle: string,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        // Patch the playbook run with updated checklists
        await client.renameChecklist(playbookRunId, checklistNumber, newTitle);

        // Update local database
        const result = await localRenameChecklist(serverUrl, checklistId, newTitle);
        return result.error ? result : {data: true};
    } catch (error) {
        logDebug('error on renameChecklist', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const addChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    checklistNumber: number,
    item: ChecklistItemInput,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.addChecklistItem(playbookRunId, checklistNumber, item);

        // Fetch and sync the entire run to get the created item with server-generated ID
        const run = await client.fetchPlaybookRun(playbookRunId);
        const result = await handlePlaybookRuns(serverUrl, [run], false, true, true);
        return result.error ? result : {data: true};
    } catch (error) {
        logDebug('error on addChecklistItem', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const deleteChecklistItem = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.deleteChecklistItem(playbookRunId, checklistNumber, itemNumber);

        // Only delete from local database if server operation succeeded
        const localResult = await localDeleteChecklistItem(serverUrl, itemId);
        if (localResult.error) {
            logDebug('error on deleteChecklistItem local deletion', localResult.error);
            return {error: localResult.error};
        }

        return {data: true};
    } catch (error) {
        logDebug('error on deleteChecklistItem', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const updateChecklistItemTitleAndDescription = async (
    serverUrl: string,
    playbookRunId: string,
    itemId: string,
    checklistNumber: number,
    itemNumber: number,
    item: ChecklistItemInput,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.updateChecklistItem(playbookRunId, checklistNumber, itemNumber, item);

        await localUpdateChecklistItemTitleAndDescription(serverUrl, itemId, item.title, item.description);
        return {data: true};
    } catch (error) {
        logDebug('error on updateChecklistItemTitleAndDescription', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
