// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

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

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        expect(client.fetchPlaybookRuns(params)).rejects.toThrow('Network error');
    });
});

describe('fetchPlaybookRun', () => {
    test('should fetch playbook run with id and groupLabel', async () => {
        const id = 'run123';
        const groupLabel: RequestGroupLabel = 'Cold Start';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${id}`;
        const expectedOptions = {method: 'get', groupLabel};
        const mockResponse = TestHelper.fakePlaybookRun({
            id,
            name: 'Test Run',
        });

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybookRun(id, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should fetch playbook run with id only', async () => {
        const id = 'run123';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${id}`;
        const expectedOptions = {method: 'get', groupLabel: undefined};
        const mockResponse = TestHelper.fakePlaybookRun({
            id,
            name: 'Test Run',
        });

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybookRun(id);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when fetching playbook run', async () => {
        const id = 'run123';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.fetchPlaybookRun(id)).rejects.toThrow('Network error');
    });
});

describe('fetchPlaybookRunMetadata', () => {
    test('should fetch playbook run metadata successfully', async () => {
        const id = 'run123';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${id}/metadata`;
        const expectedOptions = {method: 'get'};
        const mockResponse = TestHelper.fakePlaybookRunMetadata({
            channel_name: 'test-channel',
            channel_display_name: 'Test Channel',
            team_name: 'test-team',
            num_participants: 3,
            total_posts: 5,
            followers: ['user1', 'user2'],
        });

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybookRunMetadata(id);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when fetching playbook run metadata', async () => {
        const id = 'run123';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.fetchPlaybookRunMetadata(id)).rejects.toThrow('Network error');
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

describe('postStatusUpdate', () => {
    test('should post status update successfully', async () => {
        const playbookRunID = 'run123';
        const payload: PostStatusUpdatePayload = {
            message: 'Status update message',
            reminder: 3600,
            finishRun: false,
        };
        const ids: PostStatusUpdateIds = {
            user_id: 'user123',
            channel_id: 'channel123',
            team_id: 'team123',
        };
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/update-status-dialog`;
        const expectedBody = {
            type: 'dialog_submission',
            callback_id: '',
            state: '',
            cancelled: false,
            ...ids,
            submission: {
                message: payload.message,
                reminder: payload.reminder?.toFixed() ?? '',
                finish_run: payload.finishRun,
            },
        };
        const expectedOptions = {method: 'post', body: expectedBody};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.postStatusUpdate(playbookRunID, payload, ids);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should post status update with finishRun true', async () => {
        const playbookRunID = 'run123';
        const payload: PostStatusUpdatePayload = {
            message: 'Finishing run',
            finishRun: true,
        };
        const ids: PostStatusUpdateIds = {
            user_id: 'user123',
            channel_id: 'channel123',
            team_id: 'team123',
        };
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/update-status-dialog`;
        const expectedBody = {
            type: 'dialog_submission',
            callback_id: '',
            state: '',
            cancelled: false,
            ...ids,
            submission: {
                message: payload.message,
                reminder: '',
                finish_run: true,
            },
        };
        const expectedOptions = {method: 'post', body: expectedBody};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.postStatusUpdate(playbookRunID, payload, ids);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should post status update with reminder', async () => {
        const playbookRunID = 'run123';
        const payload: PostStatusUpdatePayload = {
            message: 'Status update with reminder',
            reminder: 7200,
            finishRun: false,
        };
        const ids: PostStatusUpdateIds = {
            user_id: 'user123',
            channel_id: 'channel123',
            team_id: 'team123',
        };
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/update-status-dialog`;
        const expectedBody = {
            type: 'dialog_submission',
            callback_id: '',
            state: '',
            cancelled: false,
            ...ids,
            submission: {
                message: payload.message,
                reminder: '7200',
                finish_run: false,
            },
        };
        const expectedOptions = {method: 'post', body: expectedBody};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.postStatusUpdate(playbookRunID, payload, ids);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should post status update with empty message', async () => {
        const playbookRunID = 'run123';
        const payload: PostStatusUpdatePayload = {
            message: '',
            finishRun: false,
        };
        const ids: PostStatusUpdateIds = {
            user_id: 'user123',
            channel_id: 'channel123',
            team_id: 'team123',
        };
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunID}/update-status-dialog`;
        const expectedBody = {
            type: 'dialog_submission',
            callback_id: '',
            state: '',
            cancelled: false,
            ...ids,
            submission: {
                message: '',
                reminder: '',
                finish_run: false,
            },
        };
        const expectedOptions = {method: 'post', body: expectedBody};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.postStatusUpdate(playbookRunID, payload, ids);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle error when posting status update', async () => {
        const playbookRunID = 'run123';
        const payload: PostStatusUpdatePayload = {
            message: 'Status update',
            finishRun: false,
        };
        const ids: PostStatusUpdateIds = {
            user_id: 'user123',
            channel_id: 'channel123',
            team_id: 'team123',
        };

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.postStatusUpdate(playbookRunID, payload, ids)).rejects.toThrow('Network error');
    });
});

describe('fetchPlaybooks', () => {
    test('should fetch playbooks with basic params', async () => {
        const params: FetchPlaybooksParams = {team_id: 'team1'};
        const queryParams = buildQueryString(params);
        const expectedUrl = `/plugins/playbooks/api/v0/playbooks${queryParams}`;
        const expectedOptions = {method: 'get'};
        const mockResponse: FetchPlaybooksReturn = {
            total_count: 2,
            page_count: 1,
            has_more: false,
            items: [],
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybooks(params);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should fetch playbooks with all params', async () => {
        const params: FetchPlaybooksParams = {
            team_id: 'team1',
            page: 1,
            per_page: 20,
            sort: 'title',
            direction: 'asc',
            search_term: 'test search',
            with_archived: true,
        };
        const queryParams = buildQueryString(params);
        const expectedUrl = `/plugins/playbooks/api/v0/playbooks${queryParams}`;
        const expectedOptions = {method: 'get'};
        const mockResponse: FetchPlaybooksReturn = {
            total_count: 5,
            page_count: 1,
            has_more: false,
            items: [],
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybooks(params);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should fetch playbooks with optional params only', async () => {
        const params: FetchPlaybooksParams = {
            team_id: 'team1',
            page: 0,
            per_page: 10,
            sort: 'last_run_at',
            direction: 'desc',
        };
        const queryParams = buildQueryString(params);
        const expectedUrl = `/plugins/playbooks/api/v0/playbooks${queryParams}`;
        const expectedOptions = {method: 'get'};
        const mockResponse: FetchPlaybooksReturn = {
            total_count: 3,
            page_count: 1,
            has_more: false,
            items: [],
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybooks(params);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when fetching playbooks', async () => {
        const params: FetchPlaybooksParams = {team_id: 'team1'};

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.fetchPlaybooks(params)).rejects.toThrow('Network error');
    });

    test('should fetch playbooks with search_term and with_archived', async () => {
        const params: FetchPlaybooksParams = {
            team_id: 'team1',
            search_term: 'incident',
            with_archived: false,
        };
        const queryParams = buildQueryString(params);
        const expectedUrl = `/plugins/playbooks/api/v0/playbooks${queryParams}`;
        const expectedOptions = {method: 'get'};
        const mockResponse: FetchPlaybooksReturn = {
            total_count: 1,
            page_count: 1,
            has_more: false,
            items: [],
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchPlaybooks(params);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });
});

describe('createPlaybookRun', () => {
    test('should create playbook run with all required params', async () => {
        const playbook_id = 'playbook123';
        const owner_user_id = 'user123';
        const team_id = 'team123';
        const name = 'Test Run';
        const description = 'Test Description';
        const expectedUrl = '/plugins/playbooks/api/v0/runs';
        const expectedOptions = {
            method: 'post',
            body: {
                owner_user_id,
                team_id,
                name,
                description,
                playbook_id,
                channel_id: undefined,
                create_public_run: undefined,
            },
        };
        const mockResponse = TestHelper.fakePlaybookRun({
            id: 'run123',
            name,
            description,
            playbook_id,
            owner_user_id,
            team_id,
        });

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.createPlaybookRun(
            playbook_id,
            owner_user_id,
            team_id,
            name,
            description,
        );

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should create playbook run with all params including optional', async () => {
        const playbook_id = 'playbook123';
        const owner_user_id = 'user123';
        const team_id = 'team123';
        const name = 'Test Run';
        const description = 'Test Description';
        const channel_id = 'channel123';
        const create_public_run = true;
        const expectedUrl = '/plugins/playbooks/api/v0/runs';
        const expectedOptions = {
            method: 'post',
            body: {
                owner_user_id,
                team_id,
                name,
                description,
                playbook_id,
                channel_id,
                create_public_run,
            },
        };
        const mockResponse = {
            id: 'run123',
            name,
            description,
            playbook_id,
            owner_user_id,
            team_id,
            channel_id,
            create_public_run,
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.createPlaybookRun(
            playbook_id,
            owner_user_id,
            team_id,
            name,
            description,
            channel_id,
            create_public_run,
        );

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should create playbook run with channel_id only', async () => {
        const playbook_id = 'playbook123';
        const owner_user_id = 'user123';
        const team_id = 'team123';
        const name = 'Test Run';
        const description = 'Test Description';
        const channel_id = 'channel123';
        const expectedUrl = '/plugins/playbooks/api/v0/runs';
        const expectedOptions = {
            method: 'post',
            body: {
                owner_user_id,
                team_id,
                name,
                description,
                playbook_id,
                channel_id,
                create_public_run: undefined,
            },
        };
        const mockResponse = {
            id: 'run123',
            name,
            playbook_id,
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.createPlaybookRun(
            playbook_id,
            owner_user_id,
            team_id,
            name,
            description,
            channel_id,
        );

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should create playbook run with create_public_run only', async () => {
        const playbook_id = 'playbook123';
        const owner_user_id = 'user123';
        const team_id = 'team123';
        const name = 'Test Run';
        const description = 'Test Description';
        const create_public_run = false;
        const expectedUrl = '/plugins/playbooks/api/v0/runs';
        const expectedOptions = {
            method: 'post',
            body: {
                owner_user_id,
                team_id,
                name,
                description,
                playbook_id,
                channel_id: undefined,
                create_public_run,
            },
        };
        const mockResponse = {
            id: 'run123',
            name,
            playbook_id,
        };

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.createPlaybookRun(
            playbook_id,
            owner_user_id,
            team_id,
            name,
            description,
            undefined,
            create_public_run,
        );

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should handle error when creating playbook run', async () => {
        const playbook_id = 'playbook123';
        const owner_user_id = 'user123';
        const team_id = 'team123';
        const name = 'Test Run';
        const description = 'Test Description';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(
            client.createPlaybookRun(playbook_id, owner_user_id, team_id, name, description),
        ).rejects.toThrow('Network error');
    });
});
describe('patchPlaybookRun', () => {
    test('should patch with multiple field updates', async () => {
        const playbookRunId = 'run123';
        const updates = {
            name: 'Updated Name',
            owner_user_id: 'user456',
            description: 'Updated description',
        };
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}`;
        const expectedOptions = {method: 'patch', body: updates};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.patchPlaybookRun(playbookRunId, updates);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should patch with single field update', async () => {
        const playbookRunId = 'run123';
        const updates = {name: 'New Name'};
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}`;
        const expectedOptions = {method: 'patch', body: updates};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.patchPlaybookRun(playbookRunId, updates);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle network errors', async () => {
        const playbookRunId = 'run123';
        const updates = {name: 'New Name'};

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.patchPlaybookRun(playbookRunId, updates)).rejects.toThrow('Network error');
    });

    test('should handle empty updates object', async () => {
        const playbookRunId = 'run123';
        const updates = {};
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}`;
        const expectedOptions = {method: 'patch', body: updates};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.patchPlaybookRun(playbookRunId, updates);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});

describe('renameChecklist', () => {
    test('should rename successfully', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 1;
        const newName = 'Updated Checklist Name';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/rename`;
        const expectedOptions = {method: 'put', body: {title: newName}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.renameChecklist(playbookRunId, checklistNumber, newName);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should rename with zero index', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 0;
        const newName = 'First Checklist';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/rename`;
        const expectedOptions = {method: 'put', body: {title: newName}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.renameChecklist(playbookRunId, checklistNumber, newName);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle network errors', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 1;
        const newName = 'Updated Name';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.renameChecklist(playbookRunId, checklistNumber, newName)).rejects.toThrow('Network error');
    });

    test('should handle empty name', async () => {
        const playbookRunId = 'run123';
        const checklistNumber = 1;
        const newName = '';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNumber}/rename`;
        const expectedOptions = {method: 'put', body: {title: newName}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.renameChecklist(playbookRunId, checklistNumber, newName);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});

describe('addChecklistItem', () => {
    test('should add item successfully', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const title = 'New Item';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/add`;
        const expectedOptions = {method: 'post', body: {title}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.addChecklistItem(playbookRunId, checklistNum, title);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should add item with empty title', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const title = '';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/add`;
        const expectedOptions = {method: 'post', body: {title}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.addChecklistItem(playbookRunId, checklistNum, title);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('should handle network errors', async () => {
        const playbookRunId = 'run123';
        const checklistNum = 1;
        const title = 'New Item';

        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.addChecklistItem(playbookRunId, checklistNum, title)).rejects.toThrow('Network error');
    });

    test('should handle invalid checklist number', async () => {
        const playbookRunId = 'run123';
        const checklistNum = -1;
        const title = 'New Item';
        const expectedUrl = `/plugins/playbooks/api/v0/runs/${playbookRunId}/checklists/${checklistNum}/add`;
        const expectedOptions = {method: 'post', body: {title}};

        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.addChecklistItem(playbookRunId, checklistNum, title);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
