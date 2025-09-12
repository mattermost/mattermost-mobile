// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPlaybookChecklistItemById} from '@playbooks/database/queries/item';
import {logError} from '@utils/log';

export async function updateChecklistItem(serverUrl: string, itemId: string, state: ChecklistItemState) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const item = await getPlaybookChecklistItemById(database, itemId);
        if (!item) {
            return {error: 'Item not found'};
        }

        await database.write(async () => {
            item.update((i) => {
                i.state = state;
            });
        });

        return {data: true};
    } catch (error) {
        logError('failed to update checklist item', error);
        return {error};
    }
}

export async function setChecklistItemCommand(serverUrl: string, itemId: string, command: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const item = await getPlaybookChecklistItemById(database, itemId);
        if (!item) {
            return {error: `Item not found: ${itemId}`};
        }

        await database.write(async () => {
            item.update((i) => {
                i.command = command;
            });
        });

        return {data: true};
    } catch (error) {
        logError('failed to set checklist item command', error);
        return {error};
    }
}

export async function setAssignee(serverUrl: string, itemId: string, assigneeId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const item = await getPlaybookChecklistItemById(database, itemId);
        if (!item) {
            return {error: `Item not found: ${itemId}`};
        }

        await database.write(async () => {
            item.update((i) => {
                i.assigneeId = assigneeId;
            });
        });

        return {data: true};
    } catch (error) {
        logError('failed to update checklist item assignee', error);
        return {error};
    }
}

export async function setDueDate(serverUrl: string, itemId: string, date?: number) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const item = await getPlaybookChecklistItemById(database, itemId);
        if (!item) {
            return {error: `Item not found: ${itemId}`};
        }

        await database.write(async () => {
            item.update((i) => {
                i.dueDate = date ?? 0;
            });
        });

        return {data: true};
    } catch (error) {
        logError('failed to set due date', error);
        return {error};
    }
}
