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

        await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when setting checklist item state', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const newState = 'in_progress' as ChecklistItemState;

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState)).rejects.toThrow('Network error');
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

        await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
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

        await client.setChecklistItemState(playbookRunID, checklistNum, itemNum, newState);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});

describe('runChecklistItemSlashCommand', () => {
    test('should run checklist item slash command successfully', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 1;
        const itemNumber = 2;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/item/${itemNumber}/run`;
        const expectedOptions = {method: 'post'};

        jest.mocked(client.doFetch).mockResolvedValue({trigger_id: 'trigger123'});

        const result = await client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber);
        expect(result).toEqual({trigger_id: 'trigger123'});

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should run checklist item slash command with zero indices', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 0;
        const itemNumber = 0;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/item/${itemNumber}/run`;
        const expectedOptions = {method: 'post'};

        jest.mocked(client.doFetch).mockResolvedValue({trigger_id: ''});

        const result = await client.runChecklistItemSlashCommand(playbookRunId, checklistNumber, itemNumber);
        expect(result).toEqual({trigger_id: ''});

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

describe('skipChecklistItem', () => {
    test('should skip checklist item successfully', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/skip`;
        const expectedOptions = {method: 'put', body: ''};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.skipChecklistItem(playbookRunID, checklistNum, itemNum);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should skip checklist item with zero indices', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 0;
        const itemNum = 0;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/skip`;
        const expectedOptions = {method: 'put', body: ''};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.skipChecklistItem(playbookRunID, checklistNum, itemNum);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when skipping checklist item', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.skipChecklistItem(playbookRunID, checklistNum, itemNum)).rejects.toThrow('Network error');
    });
});

describe('restoreChecklistItem', () => {
    test('should restore checklist item successfully', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/restore`;
        const expectedOptions = {method: 'put', body: ''};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.restoreChecklistItem(playbookRunID, checklistNum, itemNum);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should restore checklist item with zero indices', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 0;
        const itemNum = 0;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/restore`;
        const expectedOptions = {method: 'put', body: ''};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.restoreChecklistItem(playbookRunID, checklistNum, itemNum);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when restoring checklist item', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.restoreChecklistItem(playbookRunID, checklistNum, itemNum)).rejects.toThrow('Network error');
    });
});

describe('setChecklistItemCommand', () => {
    test('should set checklist item command successfully', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const command = '/test command';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/checklists/${checklistNum}/item/${itemNum}/command`;
        const expectedOptions = {method: 'put', body: {command}};
        const mockResponse = {success: true};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.setChecklistItemCommand(playbookRunID, checklistNum, itemNum, command);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when setting checklist item command', async () => {
        const playbookRunID = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const command = '/test command';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.setChecklistItemCommand(playbookRunID, checklistNum, itemNum, command)).rejects.toThrow('Network error');
    });
});

describe('setDueDate', () => {
    test('should set due date successfully with valid date', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const date = 1640995200000; // January 1, 2022 00:00:00 UTC
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/item/${itemNum}/duedate`;
        const expectedOptions = {method: 'put', body: {due_date: date}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.setDueDate(playbookRunId, checklistNum, itemNum, date);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
    test('should handle error when setting due date', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const date = 1640995200000;

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.setDueDate(playbookRunId, checklistNum, itemNum, date)).rejects.toThrow('Network error');
    });
});

describe('setOwner', () => {
    test('should set owner successfully', async () => {
        const playbookRunId = 'run123';
        const ownerId = 'user456';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/owner`;
        const expectedOptions = {method: 'post', body: {owner_id: ownerId}};
        const mockResponse = {success: true};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.setOwner(playbookRunId, ownerId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should set owner with empty owner id', async () => {
        const playbookRunId = 'run123';
        const ownerId = '';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/owner`;
        const expectedOptions = {method: 'post', body: {owner_id: ownerId}};
        const mockResponse = {success: true};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.setOwner(playbookRunId, ownerId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when setting owner', async () => {
        const playbookRunId = 'run123';
        const ownerId = 'user456';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.setOwner(playbookRunId, ownerId)).rejects.toThrow('Network error');
    });
});

describe('setAssignee', () => {
    test('should set assignee successfully', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const assigneeId = 'user789';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/item/${itemNum}/assignee`;
        const expectedOptions = {method: 'put', body: {assignee_id: assigneeId}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.setAssignee(playbookRunId, checklistNum, itemNum, assigneeId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should set assignee with zero indices', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 0;
        const itemNum = 0;
        const assigneeId = 'user789';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/item/${itemNum}/assignee`;
        const expectedOptions = {method: 'put', body: {assignee_id: assigneeId}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.setAssignee(playbookRunId, checklistNum, itemNum, assigneeId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should set assignee with undefined assignee id', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/item/${itemNum}/assignee`;
        const expectedOptions = {method: 'put', body: {assignee_id: undefined}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.setAssignee(playbookRunId, checklistNum, itemNum);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should set assignee with empty assignee id', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const assigneeId = '';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/item/${itemNum}/assignee`;
        const expectedOptions = {method: 'put', body: {assignee_id: assigneeId}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.setAssignee(playbookRunId, checklistNum, itemNum, assigneeId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when setting assignee', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const itemNum = 2;
        const assigneeId = 'user789';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.setAssignee(playbookRunId, checklistNum, itemNum, assigneeId)).rejects.toThrow('Network error');
    });
});

describe('finishRun', () => {
    test('should call doFetch with correct url and options', async () => {
        const playbookRunId = 'run123';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/finish`;
        const expectedOptions = {body: {}, method: 'put'};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.finishRun(playbookRunId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when finishing run', async () => {
        const playbookRunId = 'run123';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.finishRun(playbookRunId)).rejects.toThrow('Network error');
    });
});
