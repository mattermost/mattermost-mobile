// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import TestHelper from '@test/test_helper';
import {logDebug} from '@utils/log';

import {fetchPlaybooks} from './playbooks';

jest.mock('@actions/remote/session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

const serverUrl = 'baseHandler.test.com';

const mockPlaybooksResponse: FetchPlaybooksReturn = {
    total_count: 2,
    page_count: 1,
    has_more: false,
    items: [
        TestHelper.fakePlaybook({
            id: 'playbook-id-1',
            title: 'Test Playbook 1',
            description: 'Test Description 1',
        }),
        TestHelper.fakePlaybook({
            id: 'playbook-id-2',
            title: 'Test Playbook 2',
            description: 'Test Description 2',
        }),
    ],
};

const mockClient = {
    fetchPlaybooks: jest.fn(),
};

const throwFunc = () => {
    throw Error('error');
};

beforeAll(() => {
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchPlaybooks', () => {
    it('should fetch playbooks successfully', async () => {
        mockClient.fetchPlaybooks.mockResolvedValueOnce(mockPlaybooksResponse);

        const params: FetchPlaybooksParams = {
            team_id: 'team-id-1',
            page: 0,
            per_page: 10,
        };

        const result = await fetchPlaybooks(serverUrl, params);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(mockPlaybooksResponse);
        expect(mockClient.fetchPlaybooks).toHaveBeenCalledWith(params);
        expect(logDebug).not.toHaveBeenCalled();
        expect(forceLogoutIfNecessary).not.toHaveBeenCalled();
    });

    it('should handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const params: FetchPlaybooksParams = {
            team_id: 'team-id-1',
        };

        const result = await fetchPlaybooks(serverUrl, params);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(mockClient.fetchPlaybooks).not.toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalled();
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, expect.any(Error));
    });

    it('should handle API exception', async () => {
        const apiError = new Error('API error');
        mockClient.fetchPlaybooks.mockRejectedValueOnce(apiError);

        const params: FetchPlaybooksParams = {
            team_id: 'team-id-1',
            page: 1,
            per_page: 20,
            sort: 'title',
            direction: 'asc',
        };

        const result = await fetchPlaybooks(serverUrl, params);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.error).toBe(apiError);
        expect(result.data).toBeUndefined();
        expect(mockClient.fetchPlaybooks).toHaveBeenCalledWith(params);
        expect(logDebug).toHaveBeenCalledWith('error on fetchPlaybooks', expect.any(String));
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, apiError);
    });
});

