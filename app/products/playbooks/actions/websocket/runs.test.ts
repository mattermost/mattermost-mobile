// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getPlaybookChecklistById} from '@playbooks/database/queries/checklist';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';

import {
    handlePlaybookRunCreated,
    handlePlaybookRunUpdated,
    handlePlaybookRunUpdatedIncremental,
    handlePlaybookChecklistUpdated,
    handlePlaybookChecklistItemUpdated,
} from './runs';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';

const mockPlaybookList = TestHelper.createPlaybookRuns(1, 1, 1);
const mockPlaybookRun = mockPlaybookList[0];

const channelId = mockPlaybookRun.channel_id;
const playbookRunId = mockPlaybookRun.id;
const checklistId = mockPlaybookRun.checklists[0].id;
const checklistItemId = mockPlaybookRun.checklists[0].items[0].id;

jest.mock('@playbooks/actions/local/run');
jest.mock('@store/ephemeral_store');

let operator: ServerDataOperator;
beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.getServerDatabaseAndOperator(serverUrl).operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePlaybookRunCreated', () => {
    const mockWebSocketMessage = TestHelper.fakeWebsocketMessage({
        data: {
            payload: JSON.stringify({
                playbook_run: mockPlaybookRun,
            }),
        },
    });

    it('should return early when no payload', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: undefined}};

        await handlePlaybookRunCreated(serverUrl, msg);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should return early when payload cannot be parsed', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: '{{',
            },
        });

        await handlePlaybookRunCreated(serverUrl, msg);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should return early when channel is not synced', async () => {
        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(false);

        await handlePlaybookRunCreated(serverUrl, mockWebSocketMessage);
        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should handle playbook run created successfully', async () => {
        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunCreated(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(handlePlaybookRuns).toHaveBeenCalledWith(serverUrl, [mockPlaybookRun], false, true);
    });
});

describe('handlePlaybookRunUpdated', () => {
    const mockWebSocketMessage = TestHelper.fakeWebsocketMessage({
        data: {
            payload: JSON.stringify(mockPlaybookRun),
        },
    });

    it('should return early when no payload', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: undefined}};

        await handlePlaybookRunUpdated(serverUrl, msg);

        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should return early when payload cannot be parsed', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: '{{'}};

        await handlePlaybookRunUpdated(serverUrl, msg);

        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should return early when channel is not synced', async () => {
        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(false);

        await handlePlaybookRunUpdated(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should handle playbook run updated successfully', async () => {
        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunUpdated(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(handlePlaybookRuns).toHaveBeenCalledWith(serverUrl, [mockPlaybookRun], false, true);
    });
});

describe('handlePlaybookRunUpdatedIncremental', () => {
    let spyHandlePlaybookRun: jest.SpyInstance;

    const mockPlaybookRunUpdate: PlaybookRunUpdate = {
        id: playbookRunId,
        playbook_run_updated_at: Date.now(),
        changed_fields: {
            name: 'Updated Run Name',
            description: 'Updated description',
        },
    };

    const mockWebSocketMessage = TestHelper.fakeWebsocketMessage({
        data: {
            payload: JSON.stringify(mockPlaybookRunUpdate),
        },
    });

    beforeEach(() => {
        spyHandlePlaybookRun = jest.spyOn(operator, 'handlePlaybookRun');
    });

    it('should return early when no payload', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: undefined}};

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();
    });

    it('should return early when payload cannot be parsed', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: '{{'}};

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();
    });

    it('should return early when changed_fields is missing', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: JSON.stringify({
                    id: playbookRunId,
                    updated_at: Date.now(),
                }),
            },
        });
        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();
    });

    it('should return early when run is not in database', async () => {
        await handlePlaybookRunUpdatedIncremental(serverUrl, mockWebSocketMessage);

        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();
    });

    it('should return early when channel is not synced', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });
        spyHandlePlaybookRun.mockClear();

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(false);

        await handlePlaybookRunUpdatedIncremental(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();
    });

    it('should handle playbook run incremental update successfully', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });
        spyHandlePlaybookRun.mockClear();

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunUpdatedIncremental(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookRun).toHaveBeenCalled();
        const storedRun = await getPlaybookRunById(operator.database, playbookRunId);
        expect(storedRun?.name).toEqual(mockPlaybookRunUpdate.changed_fields.name);
        expect(storedRun?.description).toEqual(mockPlaybookRunUpdate.changed_fields.description);
        expect(storedRun?.updateAt).toEqual(mockPlaybookRunUpdate.playbook_run_updated_at);
    });

    it('should not add checklists even if they are present in the payload', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
            processChildren: false,
        });
        spyHandlePlaybookRun.mockClear();

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: JSON.stringify({
                    id: playbookRunId,
                    updated_at: Date.now(),
                    changed_fields: {
                        checklists: {
                            ...mockPlaybookRun.checklists[0],
                            name: 'Updated Checklist',
                        },
                    },
                }),
            },
        });

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookRun).toHaveBeenCalled();
        const checklist = await getPlaybookChecklistById(operator.database, mockPlaybookRun.checklists[0].id);
        expect(checklist).toBeUndefined();
    });
});

describe('handlePlaybookChecklistUpdated', () => {
    let spyHandlePlaybookChecklist: jest.SpyInstance;
    let spyHandlePlaybookChecklistItem: jest.SpyInstance;

    const mockChecklistUpdate: PlaybookChecklistUpdate = {
        id: checklistId,
        index: 0,
        checklist_updated_at: Date.now(),
        fields: {
            title: 'Updated Checklist',
        },
        item_inserts: [
            TestHelper.fakePlaybookChecklistItem(checklistId, {id: checklistItemId}),
        ],
    };

    const mockPlaybookChecklistUpdatePayload: PlaybookChecklistUpdatePayload = {
        playbook_run_id: playbookRunId,
        update: mockChecklistUpdate,
    };

    const mockWebSocketMessage = TestHelper.fakeWebsocketMessage({
        data: {
            payload: JSON.stringify(mockPlaybookChecklistUpdatePayload),
        },
    });

    beforeEach(() => {
        spyHandlePlaybookChecklist = jest.spyOn(operator, 'handlePlaybookChecklist');
        spyHandlePlaybookChecklistItem = jest.spyOn(operator, 'handlePlaybookChecklistItem');
    });

    it('should return early when no payload', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: undefined}};

        await handlePlaybookChecklistUpdated(serverUrl, msg);

        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when payload cannot be parsed', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: '{{',
            },
        });

        await handlePlaybookChecklistUpdated(serverUrl, msg);

        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when update.fields is missing', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: JSON.stringify({
                    playbook_run_id: playbookRunId,
                    update: {id: checklistId, index: 0, updated_at: Date.now()},
                }),
            },
        });
        await handlePlaybookChecklistUpdated(serverUrl, msg);

        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when run is not in database', async () => {
        await handlePlaybookChecklistUpdated(serverUrl, mockWebSocketMessage);

        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when channel is not synced', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(false);

        await handlePlaybookChecklistUpdated(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should handle checklist update successfully without item inserts', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });

        const payloadWithoutInserts = {
            ...mockPlaybookChecklistUpdatePayload,
            update: {
                ...mockChecklistUpdate,
                item_inserts: undefined,
            },
        };

        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: JSON.stringify(payloadWithoutInserts),
            },
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookChecklistUpdated(serverUrl, msg);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookChecklist).toHaveBeenCalledWith({
            checklists: [{
                ...mockChecklistUpdate.fields,
                items: undefined,
                id: checklistId,
                update_at: mockChecklistUpdate.checklist_updated_at,
                run_id: playbookRunId,
            }],
            prepareRecordsOnly: false,
            processChildren: false,
        });
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should handle checklist update successfully with item inserts', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookChecklistUpdated(serverUrl, mockWebSocketMessage);

        expect(spyHandlePlaybookChecklist).toHaveBeenCalledWith({
            checklists: [{
                ...mockChecklistUpdate.fields,
                items: undefined,
                id: checklistId,
                update_at: mockChecklistUpdate.checklist_updated_at,
                run_id: playbookRunId,
            }],
            prepareRecordsOnly: false,
            processChildren: false,
        });
        expect(spyHandlePlaybookChecklistItem).toHaveBeenCalledWith({
            items: [{
                ...mockChecklistUpdate.item_inserts![0],
                checklist_id: checklistId,
                update_at: mockChecklistUpdate.checklist_updated_at,
            }],
            prepareRecordsOnly: false,
        });
    });
});

describe('handlePlaybookChecklistItemUpdated', () => {
    let spyHandlePlaybookChecklistItem: jest.SpyInstance;

    const mockChecklistItemUpdate: PlaybookChecklistItemUpdate = {
        id: checklistItemId,
        index: 0,
        checklist_item_updated_at: Date.now(),
        fields: {
            title: 'Updated Item',
            state: 'closed',
        },
    };

    const mockPlaybookChecklistItemUpdatePayload: PlaybookChecklistItemUpdatePayload = {
        playbook_run_id: playbookRunId,
        checklist_id: checklistId,
        update: mockChecklistItemUpdate,
    };

    const mockWebSocketMessage = TestHelper.fakeWebsocketMessage({
        data: {
            payload: JSON.stringify(mockPlaybookChecklistItemUpdatePayload),
        },
    });

    beforeEach(() => {
        spyHandlePlaybookChecklistItem = jest.spyOn(operator, 'handlePlaybookChecklistItem');
    });

    it('should return early when no payload', async () => {
        const msg = {...mockWebSocketMessage, data: {payload: undefined}};

        await handlePlaybookChecklistItemUpdated(serverUrl, msg);

        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when payload cannot be parsed', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: '{{',
            },
        });

        await handlePlaybookChecklistItemUpdated(serverUrl, msg);

        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when run is not in database', async () => {
        await handlePlaybookChecklistItemUpdated(serverUrl, mockWebSocketMessage);

        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should return early when channel is not synced', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(false);

        await handlePlaybookChecklistItemUpdated(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
    });

    it('should handle checklist item update successfully', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookChecklistItemUpdated(serverUrl, mockWebSocketMessage);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookChecklistItem).toHaveBeenCalledWith({
            items: [{
                ...mockChecklistItemUpdate.fields,
                id: checklistItemId,
                checklist_id: checklistId,
                update_at: mockChecklistItemUpdate.checklist_item_updated_at,
            }],
            prepareRecordsOnly: false,
        });
    });
});
