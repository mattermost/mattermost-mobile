// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';

import {
    handlePlaybookRunCreated,
    handlePlaybookRunUpdated,
    handlePlaybookRunUpdatedIncremental,
} from './runs';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';

const mockPlaybookList = TestHelper.createPlaybookRuns(1, 1, 1);
const mockPlaybookRun = mockPlaybookList[0];
mockPlaybookRun.update_at = 1; // Set the update_at to a value that is before the current time to avoid flakiness

const channelId = mockPlaybookRun.channel_id;
const playbookRunId = mockPlaybookRun.id;
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
    let spyHandlePlaybookChecklist: jest.SpyInstance;
    let spyHandlePlaybookChecklistItem: jest.SpyInstance;
    let spyBatchRecords: jest.SpyInstance;

    function createFakeUpdateFromRun(run: PlaybookRun) {
        const {checklists, ...restRun} = run;
        const fakeUpdate: PlaybookRunUpdate = {
            id: run.id,
            playbook_run_updated_at: Date.now(),
            changed_fields: {
                ...restRun,
                checklists: checklists.map((checklist) => {
                    const {items, ...restChecklist} = checklist;
                    return {
                        id: checklist.id,
                        checklist_updated_at: Date.now(),
                        fields: restChecklist,
                        item_inserts: items,
                    };
                }),
            },
        };

        return fakeUpdate;
    }

    function clearSpies() {
        spyHandlePlaybookRun.mockClear();
        spyHandlePlaybookChecklist.mockClear();
        spyHandlePlaybookChecklistItem.mockClear();
        spyBatchRecords.mockClear();
    }

    function expectSpiesNotCalled() {
        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();
        expect(spyBatchRecords).not.toHaveBeenCalled();
    }

    beforeEach(() => {
        spyHandlePlaybookRun = jest.spyOn(operator, 'handlePlaybookRun');
        spyHandlePlaybookChecklist = jest.spyOn(operator, 'handlePlaybookChecklist');
        spyHandlePlaybookChecklistItem = jest.spyOn(operator, 'handlePlaybookChecklistItem');
        spyBatchRecords = jest.spyOn(operator, 'batchRecords');
    });

    it('should return early when no payload', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: undefined},
        });

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expectSpiesNotCalled();
    });

    it('should return early when payload cannot be parsed', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: '{{'},
        });

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expectSpiesNotCalled();
    });

    it('should return early when run is not in database', async () => {
        const update = createFakeUpdateFromRun(mockPlaybookRun);
        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: JSON.stringify(update)},
        });

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expectSpiesNotCalled();
    });

    it('should return early when channel is not synced', async () => {
        const update = createFakeUpdateFromRun(mockPlaybookRun);
        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: JSON.stringify(update)},
        });

        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
        });
        clearSpies();

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(false);

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expectSpiesNotCalled();
    });

    it('should handle incremental update successfully', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
            processChildren: true,
        });
        clearSpies();

        const update = createFakeUpdateFromRun(mockPlaybookRun);
        update.changed_fields.name = 'Updated Run Name';
        update.changed_fields.description = 'Updated description';
        update.changed_fields.checklists![0].fields!.title = 'Updated Checklist';
        update.changed_fields.checklists![0].item_inserts = [];
        update.changed_fields.checklists![0].item_updates = [{id: checklistItemId, checklist_item_updated_at: Date.now(), fields: {title: 'Updated Item'}}];

        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: JSON.stringify(update)},
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(EphemeralStore.getChannelPlaybooksSynced).toHaveBeenCalledWith(serverUrl, channelId);
        expect(spyHandlePlaybookRun).toHaveBeenCalled();
        const storedRun = await getPlaybookRunById(operator.database, playbookRunId);
        expect(storedRun?.name).toEqual(update.changed_fields.name);
        expect(storedRun?.description).toEqual(update.changed_fields.description);
        expect(storedRun?.updateAt).toEqual(update.playbook_run_updated_at);

        const checklists = await storedRun!.checklists.fetch();
        expect(checklists).toHaveLength(1);
        expect(checklists[0].title).toEqual(update.changed_fields.checklists![0].fields!.title);

        const items = await checklists[0].items.fetch();
        expect(items).toHaveLength(1);
        expect(items[0].title).toEqual(update.changed_fields.checklists![0].item_updates![0].fields!.title);
    });

    it('should handle incremental update without changes in the run', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
            processChildren: true,
        });
        clearSpies();

        const update = createFakeUpdateFromRun(mockPlaybookRun);
        update.changed_fields = {
            checklists: update.changed_fields.checklists,
        };

        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: JSON.stringify(update)},
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookRun).not.toHaveBeenCalled();

        expect(spyHandlePlaybookChecklist).toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).toHaveBeenCalled();
        expect(spyBatchRecords).toHaveBeenCalled();
    });

    it('should handle incremental update without changes in the checklist', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
            processChildren: true,
        });
        clearSpies();

        const update = createFakeUpdateFromRun(mockPlaybookRun);
        update.changed_fields.checklists![0].fields = undefined;

        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: JSON.stringify(update)},
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookChecklist).not.toHaveBeenCalled();

        expect(spyHandlePlaybookRun).toHaveBeenCalled();
        expect(spyHandlePlaybookChecklistItem).toHaveBeenCalled();
        expect(spyBatchRecords).toHaveBeenCalled();
    });

    it('should handle incremental update without changes in the checklist item', async () => {
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs: mockPlaybookList,
            processChildren: true,
        });
        clearSpies();

        const update = createFakeUpdateFromRun(mockPlaybookRun);
        update.changed_fields.checklists![0].item_inserts = undefined;
        update.changed_fields.checklists![0].item_updates = undefined;

        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: JSON.stringify(update)},
        });

        jest.mocked(EphemeralStore.getChannelPlaybooksSynced).mockReturnValue(true);

        await handlePlaybookRunUpdatedIncremental(serverUrl, msg);

        expect(spyHandlePlaybookChecklistItem).not.toHaveBeenCalled();

        expect(spyHandlePlaybookRun).toHaveBeenCalled();
        expect(spyHandlePlaybookChecklist).toHaveBeenCalled();
        expect(spyBatchRecords).toHaveBeenCalled();
    });
});
