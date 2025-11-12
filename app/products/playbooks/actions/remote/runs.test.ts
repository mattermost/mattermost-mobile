// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateLastPlaybookRunsFetchAt} from '@playbooks/actions/local/channel';
import {handlePlaybookRuns, setOwner as localSetOwner, renamePlaybookRun as localRenamePlaybookRun} from '@playbooks/actions/local/run';
import {getLastPlaybookRunsFetchAt} from '@playbooks/database/queries/run';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';

import {fetchPlaybookRunsForChannel, fetchFinishedRunsForChannel, fetchPlaybookRunsPageForParticipant, setOwner, finishRun, renamePlaybookRun, createPlaybookRun, fetchPlaybookRun, fetchPlaybookRunMetadata, postStatusUpdate} from './runs';

const serverUrl = 'baseHandler.test.com';
const channelId = 'channel-id-1';

const mockPlaybookRun = TestHelper.fakePlaybookRun({channel_id: channelId});
const mockPlaybookRun2 = TestHelper.fakePlaybookRun({channel_id: channelId});

const mockClient = {
    fetchPlaybookRuns: jest.fn(),
    fetchPlaybookRun: jest.fn(),
    fetchPlaybookRunMetadata: jest.fn(),
    setOwner: jest.fn(),
    finishRun: jest.fn(),
    createPlaybookRun: jest.fn(),
    postStatusUpdate: jest.fn(),
    patchPlaybookRun: jest.fn(),
};

jest.mock('@playbooks/database/queries/run');
jest.mock('@playbooks/actions/local/run');
jest.mock('@playbooks/actions/local/channel');

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

describe('fetchPlaybookRunsForChannel', () => {
    jest.mocked(getLastPlaybookRunsFetchAt).mockResolvedValue(123);

    beforeEach(() => {
        jest.mocked(handlePlaybookRuns).mockResolvedValue({data: []});
    });

    it('should handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('should return empty runs when no data', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [],
            has_more: false,
        });

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([]);

        expect(updateLastPlaybookRunsFetchAt).not.toHaveBeenCalled();
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should fetch single page of runs successfully', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: false,
        });

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([mockPlaybookRun]);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledTimes(1);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledWith({
            page: 0,
            per_page: PER_PAGE_DEFAULT,
            channel_id: channelId,
            since: 124,
        });

        expect(updateLastPlaybookRunsFetchAt).toHaveBeenCalledWith(serverUrl, channelId, mockPlaybookRun.update_at);
        expect(handlePlaybookRuns).toHaveBeenCalledWith(serverUrl, [mockPlaybookRun], false, true);
    });

    it('should fetch multiple pages of runs successfully', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: true,
        }).mockResolvedValueOnce({
            items: [mockPlaybookRun2],
            has_more: false,
        });

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([mockPlaybookRun, mockPlaybookRun2]);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledTimes(2);
    });

    it('should handle fetchOnly mode', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: false,
        });

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([mockPlaybookRun]);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should update the channel in the ephemeral store when there are no runs', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [],
            has_more: false,
        });

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([]);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
        expect(EphemeralStore.getChannelPlaybooksSynced(serverUrl, channelId)).toBe(true);
    });

    it('should update the channel in the ephemeral store', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: false,
        });

        EphemeralStore.clearChannelPlaybooksSynced(serverUrl);

        expect(EphemeralStore.getChannelPlaybooksSynced(serverUrl, channelId)).toBe(false);
        await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(EphemeralStore.getChannelPlaybooksSynced(serverUrl, channelId)).toBe(true);
    });

    it('should not update the channel in the ephemeral store if fetchOnly is true', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: false,
        });

        EphemeralStore.clearChannelPlaybooksSynced(serverUrl);

        expect(EphemeralStore.getChannelPlaybooksSynced(serverUrl, channelId)).toBe(false);
        await fetchPlaybookRunsForChannel(serverUrl, channelId, true);
        expect(EphemeralStore.getChannelPlaybooksSynced(serverUrl, channelId)).toBe(false);
    });

    it('should handle error from handlePlaybookRuns', async () => {
        jest.mocked(handlePlaybookRuns).mockResolvedValueOnce({error: new Error('Handle error')});
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: false,
        });

        const result = await fetchPlaybookRunsForChannel(serverUrl, channelId);
        expect(handlePlaybookRuns).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect((result.error as Error).message).toBe('Handle error');
    });
});

describe('fetchFinishedRunsForChannel', () => {
    it('should handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchFinishedRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('should fetch finished runs successfully', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: false,
        });

        const result = await fetchFinishedRunsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([mockPlaybookRun]);
        expect(result.has_more).toBe(false);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledWith({
            page: 0,
            per_page: PER_PAGE_DEFAULT,
            channel_id: channelId,
            statuses: ['Finished'],
            sort: 'create_at',
            direction: 'desc',
        });
    });

    it('should fetch finished runs with pagination', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValueOnce({
            items: [mockPlaybookRun],
            has_more: true,
        });

        const result = await fetchFinishedRunsForChannel(serverUrl, channelId, 1);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([mockPlaybookRun]);
        expect(result.has_more).toBe(true);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledWith({
            page: 1,
            per_page: PER_PAGE_DEFAULT,
            channel_id: channelId,
            statuses: ['Finished'],
            sort: 'create_at',
            direction: 'desc',
        });
    });
});

describe('setOwner', () => {
    const playbookRunId = 'playbook-run-id-1';
    const ownerId = 'owner-user-id-1';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(localSetOwner).mockResolvedValue({data: true});
    });

    it('should set owner successfully', async () => {
        mockClient.setOwner.mockResolvedValueOnce(undefined);

        const result = await setOwner(serverUrl, playbookRunId, ownerId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(mockClient.setOwner).toHaveBeenCalledWith(playbookRunId, ownerId);
        expect(localSetOwner).toHaveBeenCalledWith(serverUrl, playbookRunId, ownerId);
    });

    it('should handle client error', async () => {
        const clientError = new Error('Client error');
        mockClient.setOwner.mockRejectedValueOnce(clientError);

        const result = await setOwner(serverUrl, playbookRunId, ownerId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(mockClient.setOwner).toHaveBeenCalledWith(playbookRunId, ownerId);
        expect(localSetOwner).not.toHaveBeenCalled();
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await setOwner(serverUrl, playbookRunId, ownerId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(localSetOwner).not.toHaveBeenCalled();
    });

    it('should handle empty string parameters', async () => {
        mockClient.setOwner.mockResolvedValueOnce(undefined);

        const result = await setOwner(serverUrl, '', '');

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(mockClient.setOwner).toHaveBeenCalledWith('', '');
        expect(localSetOwner).toHaveBeenCalledWith(serverUrl, '', '');
    });
});

describe('finishRun', () => {
    const playbookRunId = 'run-123';

    it('should finish run successfully', async () => {
        mockClient.finishRun = jest.fn().mockResolvedValueOnce(undefined);

        const result = await finishRun(serverUrl, playbookRunId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(mockClient.finishRun).toHaveBeenCalledWith(playbookRunId);
    });

    it('should handle client error', async () => {
        const clientError = new Error('Client error');
        mockClient.finishRun = jest.fn().mockRejectedValueOnce(clientError);

        const result = await finishRun(serverUrl, playbookRunId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(mockClient.finishRun).toHaveBeenCalledWith(playbookRunId);
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await finishRun(serverUrl, playbookRunId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
    });

    it('should handle empty string parameter', async () => {
        mockClient.finishRun = jest.fn().mockResolvedValueOnce(undefined);

        const result = await finishRun(serverUrl, '');

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(mockClient.finishRun).toHaveBeenCalledWith('');
    });
});

describe('fetchPlaybookRunsPageForParticipant', () => {
    const participantId = 'participant-id-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch single page of playbook runs for participant successfully', async () => {
        const mockRuns = [mockPlaybookRun, mockPlaybookRun2];
        mockClient.fetchPlaybookRuns.mockResolvedValue({
            items: mockRuns,
            has_more: false,
        });

        const result = await fetchPlaybookRunsPageForParticipant(serverUrl, participantId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual(mockRuns);
        expect(result.hasMore).toBe(false);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledWith({
            page: 0,
            per_page: PER_PAGE_DEFAULT,
            participant_id: participantId,
            sort: 'create_at',
            direction: 'desc',
        });
    });

    it('should handle pagination with has_more = true', async () => {
        const mockRuns = [mockPlaybookRun];
        mockClient.fetchPlaybookRuns.mockResolvedValue({
            items: mockRuns,
            has_more: true,
        });

        const result = await fetchPlaybookRunsPageForParticipant(serverUrl, participantId, 2);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual(mockRuns);
        expect(result.hasMore).toBe(true);
        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledWith({
            page: 2,
            per_page: PER_PAGE_DEFAULT,
            participant_id: participantId,
            sort: 'create_at',
            direction: 'desc',
        });
    });

    it('should handle network error', async () => {
        mockClient.fetchPlaybookRuns.mockRejectedValue(new Error('Network error'));

        const result = await fetchPlaybookRunsPageForParticipant(serverUrl, participantId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.runs).toBeUndefined();
        expect(result.hasMore).toBeUndefined();
    });

    it('should handle empty results', async () => {
        mockClient.fetchPlaybookRuns.mockResolvedValue({
            items: [],
            has_more: false,
        });

        const result = await fetchPlaybookRunsPageForParticipant(serverUrl, participantId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.runs).toEqual([]);
        expect(result.hasMore).toBe(false);
    });

    it('should default to page 0 when no page is provided', async () => {
        const mockRuns = [mockPlaybookRun];
        mockClient.fetchPlaybookRuns.mockResolvedValue({
            items: mockRuns,
            has_more: false,
        });

        await fetchPlaybookRunsPageForParticipant(serverUrl, participantId);

        expect(mockClient.fetchPlaybookRuns).toHaveBeenCalledWith({
            page: 0,
            per_page: PER_PAGE_DEFAULT,
            participant_id: participantId,
            sort: 'create_at',
            direction: 'desc',
        });
    });
});

describe('createPlaybookRun', () => {
    const playbookId = 'playbook-id-1';
    const ownerUserId = 'owner-user-id-1';
    const teamId = 'team-id-1';
    const name = 'Test Playbook Run';
    const description = 'Test Description';
    const createPublicRun = true;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create playbook run successfully with all required parameters', async () => {
        const mockRun = TestHelper.fakePlaybookRun({
            id: 'run-id-1',
            playbook_id: playbookId,
            owner_user_id: ownerUserId,
            team_id: teamId,
            name,
            description,
        });
        mockClient.createPlaybookRun.mockResolvedValueOnce(mockRun);

        const result = await createPlaybookRun(serverUrl, playbookId, ownerUserId, teamId, name, description);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(mockRun);
        expect(mockClient.createPlaybookRun).toHaveBeenCalledWith(
            playbookId,
            ownerUserId,
            teamId,
            name,
            description,
            undefined,
            undefined,
        );
    });

    it('should create playbook run successfully with optional parameters', async () => {
        const mockRun = TestHelper.fakePlaybookRun({
            id: 'run-id-1',
            playbook_id: playbookId,
            owner_user_id: ownerUserId,
            team_id: teamId,
            name,
            description,
            channel_id: channelId,
        });
        mockClient.createPlaybookRun.mockResolvedValueOnce(mockRun);

        const result = await createPlaybookRun(serverUrl, playbookId, ownerUserId, teamId, name, description, channelId, createPublicRun);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(mockRun);
        expect(mockClient.createPlaybookRun).toHaveBeenCalledWith(
            playbookId,
            ownerUserId,
            teamId,
            name,
            description,
            channelId,
            createPublicRun,
        );
    });

    it('should handle client error', async () => {
        const clientError = new Error('Client error');
        mockClient.createPlaybookRun.mockRejectedValueOnce(clientError);

        const result = await createPlaybookRun(serverUrl, playbookId, ownerUserId, teamId, name, description);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(mockClient.createPlaybookRun).toHaveBeenCalledWith(
            playbookId,
            ownerUserId,
            teamId,
            name,
            description,
            undefined,
            undefined,
        );
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await createPlaybookRun(serverUrl, playbookId, ownerUserId, teamId, name, description);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
    });
});

describe('fetchPlaybookRun', () => {
    const runId = 'run-id-1';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(handlePlaybookRuns).mockResolvedValue({data: []});
    });

    it('should fetch playbook run successfully', async () => {
        const mockRun = TestHelper.fakePlaybookRun({
            id: runId,
            channel_id: channelId,
        });
        mockClient.fetchPlaybookRun.mockResolvedValueOnce(mockRun);

        const result = await fetchPlaybookRun(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.run).toEqual(mockRun);
        expect(mockClient.fetchPlaybookRun).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRuns).toHaveBeenCalledWith(serverUrl, [mockRun], false, true);
    });

    it('should fetch playbook run successfully with fetchOnly mode', async () => {
        const mockRun = TestHelper.fakePlaybookRun({
            id: runId,
            channel_id: channelId,
        });
        mockClient.fetchPlaybookRun.mockResolvedValueOnce(mockRun);

        const result = await fetchPlaybookRun(serverUrl, runId, true);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.run).toEqual(mockRun);
        expect(mockClient.fetchPlaybookRun).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should handle client error', async () => {
        const clientError = new Error('Client error');
        mockClient.fetchPlaybookRun.mockRejectedValueOnce(clientError);

        const result = await fetchPlaybookRun(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.run).toBeUndefined();
        expect(mockClient.fetchPlaybookRun).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });

    it('should handle handlePlaybookRuns error', async () => {
        const mockRun = TestHelper.fakePlaybookRun({
            id: runId,
            channel_id: channelId,
        });
        const handleError = new Error('Handle error');
        mockClient.fetchPlaybookRun.mockResolvedValueOnce(mockRun);
        jest.mocked(handlePlaybookRuns).mockResolvedValueOnce({error: handleError});

        const result = await fetchPlaybookRun(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toEqual(handleError);
        expect(result.run).toBeUndefined();
        expect(mockClient.fetchPlaybookRun).toHaveBeenCalledWith(runId);
        expect(handlePlaybookRuns).toHaveBeenCalledWith(serverUrl, [mockRun], false, true);
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchPlaybookRun(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.run).toBeUndefined();
        expect(handlePlaybookRuns).not.toHaveBeenCalled();
    });
});

describe('fetchPlaybookRunMetadata', () => {
    const runId = 'run-id-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch playbook run metadata successfully', async () => {
        const mockMetadata = TestHelper.fakePlaybookRunMetadata();
        mockClient.fetchPlaybookRunMetadata.mockResolvedValueOnce(mockMetadata);

        const result = await fetchPlaybookRunMetadata(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.metadata).toEqual(mockMetadata);
        expect(mockClient.fetchPlaybookRunMetadata).toHaveBeenCalledWith(runId);
    });

    it('should handle client error', async () => {
        const clientError = new Error('Client error');
        mockClient.fetchPlaybookRunMetadata.mockRejectedValueOnce(clientError);

        const result = await fetchPlaybookRunMetadata(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.metadata).toBeUndefined();
        expect(mockClient.fetchPlaybookRunMetadata).toHaveBeenCalledWith(runId);
    });

    it('should handle network manager error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchPlaybookRunMetadata(serverUrl, runId);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.metadata).toBeUndefined();
    });
});

describe('postStatusUpdate', () => {
    const playbookRunID = 'run-id-1';
    const payload = {
        message: 'Test status update message',
        reminder: 3600000,
        finishRun: false,
    };
    const ids = {
        user_id: 'user-id-1',
        channel_id: 'channel-id-1',
        team_id: 'team-id-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should post status update successfully', async () => {
        mockClient.postStatusUpdate.mockResolvedValueOnce(undefined);

        const result = await postStatusUpdate(serverUrl, playbookRunID, payload, ids);
        expect(result.error).toBeUndefined();

        expect(mockClient.postStatusUpdate).toHaveBeenCalledWith(playbookRunID, payload, ids);
        expect(mockClient.postStatusUpdate).toHaveBeenCalledTimes(1);
    });

    it('should post status update successfully without reminder', async () => {
        const payloadWithoutReminder = {
            message: 'Test status update message',
            finishRun: false,
        };
        mockClient.postStatusUpdate.mockResolvedValueOnce(undefined);

        const result = await postStatusUpdate(serverUrl, playbookRunID, payloadWithoutReminder, ids);
        expect(result.error).toBeUndefined();

        expect(mockClient.postStatusUpdate).toHaveBeenCalledWith(playbookRunID, payloadWithoutReminder, ids);
    });

    it('should handle client error gracefully', async () => {
        const clientError = new Error('Client error');
        mockClient.postStatusUpdate.mockRejectedValueOnce(clientError);

        const result = await postStatusUpdate(serverUrl, playbookRunID, payload, ids);
        expect(result.error).toBe(clientError);

        expect(mockClient.postStatusUpdate).toHaveBeenCalledWith(playbookRunID, payload, ids);
    });

    it('should handle network manager error gracefully', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await postStatusUpdate(serverUrl, playbookRunID, payload, ids);
        expect(result.error).toBeDefined();

    });
});

describe('renamePlaybookRun', () => {
    const playbookRunId = 'playbook-run-id-1';
    const newName = 'New Run Name';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(localRenamePlaybookRun).mockResolvedValue({data: true});
    });

    it('should handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await renamePlaybookRun(serverUrl, playbookRunId, newName);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(localRenamePlaybookRun).not.toHaveBeenCalled();
    });

    it('should handle API exception', async () => {
        const clientError = new Error('Client error');
        mockClient.patchPlaybookRun.mockRejectedValueOnce(clientError);

        const result = await renamePlaybookRun(serverUrl, playbookRunId, newName);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(mockClient.patchPlaybookRun).toHaveBeenCalledWith(playbookRunId, {name: newName});
        expect(localRenamePlaybookRun).not.toHaveBeenCalled();
    });

    it('should rename playbook run successfully', async () => {
        mockClient.patchPlaybookRun.mockResolvedValueOnce(undefined);

        const result = await renamePlaybookRun(serverUrl, playbookRunId, newName);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(mockClient.patchPlaybookRun).toHaveBeenCalledWith(playbookRunId, {name: newName});
        expect(localRenamePlaybookRun).toHaveBeenCalledWith(serverUrl, playbookRunId, newName);

    });
});

