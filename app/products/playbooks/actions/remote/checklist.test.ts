// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {
    setChecklistItemCommand as localSetChecklistItemCommand,
    updateChecklistItem as localUpdateChecklistItem,
    setAssignee as localSetAssignee,
    setDueDate as localSetDueDate,
} from '@playbooks/actions/local/checklist';

import {
    updateChecklistItem,
    runChecklistItem,
    skipChecklistItem,
    restoreChecklistItem,
    setChecklistItemCommand,
    setAssignee,
    setDueDate,
} from './checklist';

const serverUrl = 'baseHandler.test.com';

const playbookRunId = 'playbook-run-id-1';
const itemId = 'checklist-item-id-1';
const checklistNumber = 0;
const itemNumber = 1;
const command = '/test-command';

const mockClient = {
    setChecklistItemState: jest.fn(),
    runChecklistItemSlashCommand: jest.fn(),
    skipChecklistItem: jest.fn(),
    restoreChecklistItem: jest.fn(),
    setAssignee: jest.fn(),
    setChecklistItemCommand: jest.fn(),
    setDueDate: jest.fn(),
};

jest.mock('@playbooks/actions/local/checklist');

const throwFunc = () => {
    throw Error('error');
};

beforeAll(() => {
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('checklist', () => {
    describe('updateChecklistItem', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await updateChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 'closed');
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(localUpdateChecklistItem).not.toHaveBeenCalled();
        });

        it('should update checklist item successfully', async () => {
            mockClient.setChecklistItemState.mockResolvedValueOnce({});

            const result = await updateChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 'closed');
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.setChecklistItemState).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, 'closed');
            expect(localUpdateChecklistItem).toHaveBeenCalledWith(serverUrl, itemId, 'closed');
        });
    });

    describe('runChecklistItem', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await runChecklistItem(serverUrl, playbookRunId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
        });

        it('should handle API exception', async () => {
            mockClient.runChecklistItemSlashCommand.mockImplementationOnce(throwFunc);

            const result = await runChecklistItem(serverUrl, playbookRunId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
        });

        it('should run checklist item successfully', async () => {
            mockClient.runChecklistItemSlashCommand.mockResolvedValueOnce({});

            const result = await runChecklistItem(serverUrl, playbookRunId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.runChecklistItemSlashCommand).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber);
        });

        it('should set trigger id if it is returned', async () => {
            mockClient.runChecklistItemSlashCommand.mockResolvedValueOnce({trigger_id: 'trigger_id'});
            const setTriggerId = jest.fn();
            jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
                setTriggerId,
            } as any);

            const result = await runChecklistItem(serverUrl, playbookRunId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(setTriggerId).toHaveBeenCalledWith('trigger_id');
        });

        it('should not set trigger id if it is not returned', async () => {
            mockClient.runChecklistItemSlashCommand.mockResolvedValueOnce({});
            const setTriggerId = jest.fn();
            jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
                setTriggerId,
            } as any);

            const result = await runChecklistItem(serverUrl, playbookRunId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(setTriggerId).not.toHaveBeenCalled();
        });
    });

    describe('skipChecklistItem', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await skipChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(mockClient.skipChecklistItem).not.toHaveBeenCalled();
            expect(localUpdateChecklistItem).not.toHaveBeenCalled();
        });

        it('should handle API exception', async () => {
            mockClient.skipChecklistItem.mockImplementationOnce(throwFunc);

            const result = await skipChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(mockClient.skipChecklistItem).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber);
            expect(localUpdateChecklistItem).not.toHaveBeenCalled();
        });

        it('should skip checklist item successfully', async () => {
            mockClient.skipChecklistItem.mockResolvedValueOnce({});

            const result = await skipChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.skipChecklistItem).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber);
            expect(localUpdateChecklistItem).toHaveBeenCalledWith(serverUrl, itemId, 'skipped');
        });
    });

    describe('restoreChecklistItem', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await restoreChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
        });

        it('should handle API exception', async () => {
            mockClient.restoreChecklistItem.mockImplementationOnce(throwFunc);

            const result = await restoreChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
        });

        it('should restore checklist item successfully', async () => {
            mockClient.restoreChecklistItem.mockResolvedValueOnce({});

            const result = await restoreChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.restoreChecklistItem).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber);
            expect(localUpdateChecklistItem).toHaveBeenCalledWith(serverUrl, itemId, '');
        });
    });

    describe('setAssignee', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await setAssignee(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 'user-id-1');
            expect(result.error).toBeDefined();
            expect(mockClient.setAssignee).not.toHaveBeenCalled();
            expect(localSetAssignee).not.toHaveBeenCalled();
        });

        it('should handle API exception', async () => {
            mockClient.setAssignee.mockImplementationOnce(throwFunc);

            const result = await setAssignee(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 'user-id-1');
            expect(result.error).toBeDefined();
            expect(mockClient.setAssignee).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, 'user-id-1');
            expect(localSetAssignee).not.toHaveBeenCalled();
        });

        it('should set assignee successfully', async () => {
            mockClient.setAssignee.mockResolvedValueOnce({});

            const result = await setAssignee(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 'user-id-1');
            expect(result.data).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockClient.setAssignee).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, 'user-id-1');
            expect(localSetAssignee).toHaveBeenCalledWith(serverUrl, itemId, 'user-id-1');
        });

        it('should handle empty assignee ID', async () => {
            mockClient.setAssignee.mockResolvedValueOnce({});

            const result = await setAssignee(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, '');
            expect(result.data).toBe(true);
            expect(result.error).toBeUndefined();
            expect(mockClient.setAssignee).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, '');
            expect(localSetAssignee).toHaveBeenCalledWith(serverUrl, itemId, '');
        });
    });

    describe('setChecklistItemCommand', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await setChecklistItemCommand(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, command);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(localSetChecklistItemCommand).not.toHaveBeenCalled();
        });

        it('should handle API exception', async () => {
            mockClient.setChecklistItemCommand.mockImplementationOnce(throwFunc);

            const result = await setChecklistItemCommand(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, command);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(mockClient.setChecklistItemCommand).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, command);
            expect(localSetChecklistItemCommand).not.toHaveBeenCalled();
        });

        it('should set checklist item command successfully', async () => {
            mockClient.setChecklistItemCommand.mockResolvedValueOnce({});

            const result = await setChecklistItemCommand(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, command);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.setChecklistItemCommand).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, command);
            expect(localSetChecklistItemCommand).toHaveBeenCalledWith(serverUrl, itemId, command);
        });
    });

    describe('setDueDate', () => {
        it('should handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await setDueDate(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 1234567890);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(localSetDueDate).not.toHaveBeenCalled();
        });

        it('should handle API exception', async () => {
            mockClient.setDueDate.mockImplementationOnce(throwFunc);

            const result = await setDueDate(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 1234567890);
            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(mockClient.setDueDate).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, 1234567890);
            expect(localSetDueDate).not.toHaveBeenCalled();
        });

        it('should set due date successfully with valid date', async () => {
            mockClient.setDueDate.mockResolvedValueOnce({});

            const result = await setDueDate(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 1234567890);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.setDueDate).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, 1234567890);
            expect(localSetDueDate).toHaveBeenCalledWith(serverUrl, itemId, 1234567890);
        });

        it('should set due date successfully with undefined date', async () => {
            mockClient.setDueDate.mockResolvedValueOnce({});

            const result = await setDueDate(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.setDueDate).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, undefined);
            expect(localSetDueDate).toHaveBeenCalledWith(serverUrl, itemId, undefined);
        });

        it('should set due date successfully with zero date', async () => {
            mockClient.setDueDate.mockResolvedValueOnce({});

            const result = await setDueDate(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 0);
            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.data).toBe(true);
            expect(mockClient.setDueDate).toHaveBeenCalledWith(playbookRunId, checklistNumber, itemNumber, 0);
            expect(localSetDueDate).toHaveBeenCalledWith(serverUrl, itemId, 0);
        });
    });
});
