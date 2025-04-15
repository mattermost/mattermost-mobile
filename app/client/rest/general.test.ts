// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';
import ClientError from './error';

import type ClientBase from './base';
import type {ClientGeneralMix} from './general';

describe('ClientGeneral', () => {
    let client: ClientGeneralMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('ping', async () => {
        const deviceId = 'device1';
        const timeoutInterval = 1000;
        const groupLabel = 'DeepLink';
        const expectedUrl = `${client.urlVersion}/system/ping`;
        const expectedOptions = {method: 'get', timeoutInterval, groupLabel};

        await client.ping(deviceId, timeoutInterval, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expect.stringContaining(expectedUrl), expectedOptions, false);
    });

    test('logClientError', async () => {
        client.enableLogging = true;
        const message = 'debug message';
        const level = 'DEBUG';
        const expectedUrl = `${client.urlVersion}/logs`;
        const expectedOptions = {method: 'post', body: {message, level}};

        await client.logClientError(message, level);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default level
        await client.logClientError(message);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, {method: 'post', body: {message, level: 'ERROR'}});
    });

    test('logClientError should throw error if logging is disabled', async () => {
        client.enableLogging = false;
        const message = 'error message';
        const level = 'ERROR';
        const expectedUrl = `${client.urlVersion}/logs`;

        await expect(client.logClientError(message, level)).rejects.toThrow(new ClientError(client.apiClient.baseUrl, {
            message: 'Logging disabled.',
            url: expectedUrl,
        }));
    });

    test('getClientConfigOld', async () => {
        const groupLabel = 'Notification';
        const expectedUrl = `${client.urlVersion}/config/client?format=old`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getClientConfigOld(groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getClientLicenseOld', async () => {
        const groupLabel = 'Notification';
        const expectedUrl = `${client.urlVersion}/license/client?format=old`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getClientLicenseOld(groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getLicenseLoadMetric', async () => {
        const expectedUrl = `${client.urlVersion}/license/load_metric`;
        const expectedOptions = {method: 'get'};

        await client.getLicenseLoadMetric();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTimezones', async () => {
        const expectedUrl = client.getTimezonesRoute();
        const expectedOptions = {method: 'get'};

        await client.getTimezones();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getGlobalDataRetentionPolicy', async () => {
        const groupLabel = 'Notification';
        const expectedUrl = `${client.getGlobalDataRetentionRoute()}/policy`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getGlobalDataRetentionPolicy(groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamDataRetentionPolicies', async () => {
        const userId = 'user1';
        const page = 1;
        const perPage = 10;
        const groupLabel = 'Notification';
        const expectedUrl = `${client.getGranularDataRetentionRoute(userId)}/team_policies${buildQueryString({page, per_page: perPage})}`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getTeamDataRetentionPolicies(userId, page, perPage, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getTeamDataRetentionPolicies(userId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getGranularDataRetentionRoute(userId)}/team_policies${buildQueryString({page: 0, per_page: PER_PAGE_DEFAULT})}`, {method: 'get', groupLabel: undefined});
    });

    test('getChannelDataRetentionPolicies', async () => {
        const userId = 'user1';
        const page = 1;
        const perPage = 10;
        const groupLabel = 'Notification';
        const expectedUrl = `${client.getGranularDataRetentionRoute(userId)}/channel_policies${buildQueryString({page, per_page: perPage})}`;
        const expectedOptions = {method: 'get', groupLabel};

        await client.getChannelDataRetentionPolicies(userId, page, perPage, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getChannelDataRetentionPolicies(userId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getGranularDataRetentionRoute(userId)}/channel_policies${buildQueryString({page: 0, per_page: PER_PAGE_DEFAULT})}`, {method: 'get', groupLabel: undefined});
    });

    test('getRolesByNames', async () => {
        const rolesNames = ['role1', 'role2'];
        const groupLabel = 'Notification';
        const expectedUrl = `${client.getRolesRoute()}/names`;
        const expectedOptions = {method: 'post', body: rolesNames, groupLabel};

        await client.getRolesByNames(rolesNames, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getRedirectLocation', async () => {
        const urlParam = 'http://example.com';
        const expectedUrl = `${client.getRedirectLocationRoute()}${buildQueryString({url: urlParam})}`;
        const expectedOptions = {method: 'get'};

        // Test with empty url
        await client.getRedirectLocation('');
        expect(client.doFetch).not.toHaveBeenCalled();

        // Test with non-empty url
        await client.getRedirectLocation(urlParam);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('sendPerformanceReport', async () => {
        const report = {start: 0, end: 1} as PerformanceReport;
        const expectedUrl = client.getPerformanceRoute();
        const expectedOptions = {method: 'post', body: report};

        await client.sendPerformanceReport(report);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
