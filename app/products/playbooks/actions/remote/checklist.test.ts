// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateChecklistItem as localUpdateChecklistItem} from '@playbooks/actions/local/checklist';

import {updateChecklistItem, runChecklistItem} from './checklist';

const serverUrl = 'baseHandler.test.com';

const playbookRunId = 'playbook-run-id-1';
const itemId = 'checklist-item-id-1';
const checklistNumber = 0;
const itemNumber = 1;

const mockClient = {
    setChecklistItemState: jest.fn(),
    runChecklistItemSlashCommand: jest.fn(),
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

        it('should handle API error response', async () => {
            mockClient.setChecklistItemState.mockResolvedValueOnce({error: 'API error'});

            const result = await updateChecklistItem(serverUrl, playbookRunId, itemId, checklistNumber, itemNumber, 'closed');
            expect(result).toBeDefined();
            expect(result.error).toBe('API error');
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
    });
});
