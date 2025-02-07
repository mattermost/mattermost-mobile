// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {fetchDataRetentionPolicy, fetchConfigAndLicense} from './systems';

const serverUrl = 'baseHandler.test.com';

const globalPolicy = {
    message_deletion_enabled: true,
    file_deletion_enabled: true,
    message_retention_cutoff: 30,
    file_retention_cutoff: 30,
};

const teamPolicy = {
    team_id: 'team1',
    post_duration: 30,
};

const channelPolicy = {
    channel_id: 'channel1',
    post_duration: 30,
};

const config = {
    DiagnosticsEnabled: 'true',
    EnableDeveloper: 'true',
} as ClientConfig;

const license = {
    IsLicensed: 'true',
    DataRetention: 'true',
} as ClientLicense;

const mockClient = {
    getGlobalDataRetentionPolicy: jest.fn(() => globalPolicy),
    getTeamDataRetentionPolicies: jest.fn(() => ({policies: [teamPolicy], total_count: 1})),
    getChannelDataRetentionPolicies: jest.fn(() => ({policies: [channelPolicy], total_count: 1})),
    getClientConfigOld: jest.fn(() => config),
    getClientLicenseOld: jest.fn(() => license),
};

jest.mock('@managers/network_manager', () => ({
    getClient: () => mockClient,
}));

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

describe('systems', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('fetchDataRetentionPolicy - handle not found database', async () => {
        const result = await fetchDataRetentionPolicy('foo') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchDataRetentionPolicy - base case', async () => {
        const result = await fetchDataRetentionPolicy(serverUrl);
        expect(result).toBeDefined();
        expect(result.globalPolicy).toBeDefined();
        expect(result.teamPolicies).toBeDefined();
        expect(result.channelPolicies).toBeDefined();
        expect(result.globalPolicy).toEqual(globalPolicy);
        expect(result.teamPolicies).toEqual([teamPolicy]);
        expect(result.channelPolicies).toEqual([channelPolicy]);
    });

    it('fetchDataRetentionPolicy - fetch only', async () => {
        const result = await fetchDataRetentionPolicy(serverUrl, true);
        expect(result).toBeDefined();
        expect(result.globalPolicy).toBeDefined();
        expect(result.teamPolicies).toBeDefined();
        expect(result.channelPolicies).toBeDefined();
        expect(result.globalPolicy).toEqual(globalPolicy);
        expect(result.teamPolicies).toEqual([teamPolicy]);
        expect(result.channelPolicies).toEqual([channelPolicy]);
    });

    it('fetchDataRetentionPolicy - error case', async () => {
        mockClient.getGlobalDataRetentionPolicy.mockImplementationOnce(() => {
            throw new Error('error');
        });
        const result = await fetchDataRetentionPolicy(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchConfigAndLicense - base case', async () => {
        const result = await fetchConfigAndLicense(serverUrl);
        expect(result).toBeDefined();
        expect(result.config).toBeDefined();
        expect(result.license).toBeDefined();
        expect(result.config).toEqual(config);
        expect(result.license).toEqual(license);
    });

    it('fetchConfigAndLicense - fetch only', async () => {
        const result = await fetchConfigAndLicense(serverUrl, true);
        expect(result).toBeDefined();
        expect(result.config).toBeDefined();
        expect(result.license).toBeDefined();
        expect(result.config).toEqual(config);
        expect(result.license).toEqual(license);
    });

    it('fetchConfigAndLicense - error case', async () => {
        mockClient.getClientConfigOld.mockImplementationOnce(() => {
            throw new Error('error');
        });
        const result = await fetchConfigAndLicense(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });
});
