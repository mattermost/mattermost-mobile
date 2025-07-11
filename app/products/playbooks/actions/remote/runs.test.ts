// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateLastPlaybookRunsFetchAt} from '@playbooks/actions/local/channel';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getLastPlaybookRunsFetchAt} from '@playbooks/database/queries/run';
import TestHelper from '@test/test_helper';

import {fetchPlaybookRunsForChannel, fetchFinishedRunsForChannel} from './runs';

const serverUrl = 'baseHandler.test.com';
const channelId = 'channel-id-1';

const mockPlaybookRun = TestHelper.fakePlaybookRun({channel_id: channelId});
const mockPlaybookRun2 = TestHelper.fakePlaybookRun({channel_id: channelId});

const mockClient = {
    fetchPlaybookRuns: jest.fn(),
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
            sort: 'end_at',
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
            sort: 'end_at',
        });
    });
});
