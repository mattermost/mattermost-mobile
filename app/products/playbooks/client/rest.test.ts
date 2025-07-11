// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

let client: any;

beforeEach(() => {
    client = TestHelper.createClient();
    client.doFetch = jest.fn();
});

describe('fetchPlaybookRuns', () => {
    test('should fetch playbook runs with params and groupLabel', async () => {
        const params = {team_id: 'team1', page: 1, per_page: 10};
        const groupLabel: RequestGroupLabel = 'Cold Start';
        const queryParams = buildQueryString(params);
        const expectedUrl = `/plugins/playbooks/api/v0/runs${queryParams}`;
        const expectedOptions = {method: 'get', groupLabel};
        const mockResponse = {items: [], total_count: 0, page_count: 0, has_more: false};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybookRuns(params, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should fetch playbook runs with params only', async () => {
        const params = {team_id: 'team1', page: 0, per_page: 10};
        const queryParams = buildQueryString(params);
        const expectedUrl = `/plugins/playbooks/api/v0/runs${queryParams}`;
        const expectedOptions = {method: 'get', groupLabel: undefined};
        const mockResponse = {items: [], total_count: 0, page_count: 0, has_more: false};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybookRuns(params);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should return default response when doFetch returns null', async () => {
        const params = {team_id: 'team1', page: 0, per_page: 10};
        const expectedResponse = {items: [], total_count: 0, page_count: 0, has_more: false};

        jest.mocked(client.doFetch).mockResolvedValue(null);

        const result = await client.fetchPlaybookRuns(params);

        expect(result).toEqual(expectedResponse);
    });

    test('should return default response when doFetch throws error', async () => {
        const params = {team_id: 'team1', page: 0, per_page: 10};
        const expectedResponse = {items: [], total_count: 0, page_count: 0, has_more: false};

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        const result = await client.fetchPlaybookRuns(params);

        expect(result).toEqual(expectedResponse);
    });
});

describe('setChecklistItemState', () => {
    test('should set checklist item state successfully', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const newState: ChecklistItemState = 'closed';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/state`;
        const expectedOptions = {method: 'put', body: {new_state: newState}};
        const mockResponse = {success: true};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when setting checklist item state', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const newState = 'in_progress' as ChecklistItemState;
        const expectedError = {error: new Error('Network error')};

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        const result = await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(result).toEqual(expectedError);
    });

    test('should set checklist item state with empty state', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 0;
        const itemNum = 0;
        const newState: ChecklistItemState = '';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/state`;
        const expectedOptions = {method: 'put', body: {new_state: newState}};
        const mockResponse = {success: true};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should set checklist item state with skipped state', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 2;
        const itemNum = 3;
        const newState: ChecklistItemState = 'skipped';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/state`;
        const expectedOptions = {method: 'put', body: {new_state: newState}};
        const mockResponse = {success: true};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });
});

describe('runChecklistItemSlashCommand', () => {
    test('should run checklist item slash command successfully', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 1;
        const itemNumber = 2;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/item/${itemNumber}/run`;
        const expectedOptions = {method: 'post'};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should run checklist item slash command with zero indices', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 0;
        const itemNumber = 0;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/item/${itemNumber}/run`;
        const expectedOptions = {method: 'post'};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when running checklist item slash command', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 1;
        const itemNumber = 2;

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber)).rejects.toThrow('Network error');
    });
});
