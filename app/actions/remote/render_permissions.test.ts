// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RedactionInvalidationReason, invalidateRedactionGlobally} from '@actions/local/redaction';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import RenderPermissionsStore, {RENDER_PERMISSIONS_RETRY_MS, RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';

import {fetchRenderPermissions} from './render_permissions';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'render-permissions.test.com';
const channelId = 'channelid1';
let operator: ServerDataOperator;

const allowed: ActionSearchResponse = {
    resource: {type: 'channel', id: channelId},
    results: [{action: {name: 'upload_file_attachment'}}],
    decisions: {upload_file_attachment: {allowed: true, evaluated: true}},
};

const mockClient = {
    searchChannelActionDecisions: jest.fn(),
};

const storeConfig = async (config: Record<string, string>) => {
    await operator.handleConfigs({
        configs: Object.entries(config).map(([id, value]) => ({id, value})),
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
};

const enforcedOnServer = (version: string) => storeConfig({
    Version: version,
    FeatureFlagPermissionPolicies: 'true',
    EnableAttributeBasedAccessControl: 'true',
});

describe('fetchRenderPermissions', () => {
    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        mockClient.searchChannelActionDecisions.mockReset();
        jest.spyOn(RenderPermissionsStore, 'setEntry');
    });

    afterEach(async () => {
        RenderPermissionsStore.removeServer(serverUrl);
        jest.restoreAllMocks();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should store the decisions under the epoch captured before the request', async () => {
        await enforcedOnServer('12.0.0');
        mockClient.searchChannelActionDecisions.mockImplementationOnce(async () => {
            // An invalidation landing while the request is in flight must leave the answer stale.
            await invalidateRedactionGlobally(serverUrl, RedactionInvalidationReason.GlobalPolicy);
            return allowed;
        });

        const result = await fetchRenderPermissions(serverUrl, channelId);

        expect(result).toEqual({decisions: allowed.decisions});
        expect(mockClient.searchChannelActionDecisions).toHaveBeenCalledTimes(1);
        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toEqual({epoch: 1, decisions: allowed.decisions});
    });

    it('should make one request for concurrent callers', async () => {
        await enforcedOnServer('12.0.0');
        mockClient.searchChannelActionDecisions.mockResolvedValue(allowed);

        await Promise.all([
            fetchRenderPermissions(serverUrl, channelId),
            fetchRenderPermissions(serverUrl, channelId),
        ]);

        expect(mockClient.searchChannelActionDecisions).toHaveBeenCalledTimes(1);
    });

    it('should not ask a server older than the API, or one not enforcing ABAC', async () => {
        await enforcedOnServer('11.9.0');
        expect(await fetchRenderPermissions(serverUrl, channelId)).toEqual({});

        await storeConfig({Version: '12.0.0', EnableAttributeBasedAccessControl: 'false'});
        expect(await fetchRenderPermissions(serverUrl, channelId)).toEqual({});

        expect(mockClient.searchChannelActionDecisions).not.toHaveBeenCalled();
        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toBeUndefined();
    });

    it('should back off on repeated denies caused by an evaluation failure', async () => {
        await enforcedOnServer('12.0.0');
        const evaluationFailed = {
            ...allowed,
            decisions: {upload_file_attachment: {allowed: false, evaluated: true, reason: 'restricted_by_policy'}},
        };
        mockClient.searchChannelActionDecisions.mockResolvedValue(evaluationFailed);

        await fetchRenderPermissions(serverUrl, channelId);
        expect(RenderPermissionsStore.setEntry).toHaveBeenLastCalledWith(serverUrl, channelId, expect.any(Object), RENDER_PERMISSIONS_RETRY_MS);

        await fetchRenderPermissions(serverUrl, channelId);
        expect(RenderPermissionsStore.setEntry).toHaveBeenLastCalledWith(serverUrl, channelId, expect.any(Object), RENDER_PERMISSIONS_RETRY_MS * 2);
        expect(mockClient.searchChannelActionDecisions).toHaveBeenCalledTimes(2);
    });

    it('should keep the previous decisions on failure, retrying soon unless the refusal is permanent', async () => {
        await enforcedOnServer('12.0.0');
        mockClient.searchChannelActionDecisions.mockResolvedValueOnce(allowed);
        await fetchRenderPermissions(serverUrl, channelId);

        mockClient.searchChannelActionDecisions.mockRejectedValueOnce(new Error('network down'));
        const failed = await fetchRenderPermissions(serverUrl, channelId);

        expect(failed.error).toBeDefined();
        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toEqual({epoch: 1, decisions: allowed.decisions});
        expect(RenderPermissionsStore.setEntry).toHaveBeenLastCalledWith(serverUrl, channelId, expect.any(Object), RENDER_PERMISSIONS_RETRY_MS);

        mockClient.searchChannelActionDecisions.mockRejectedValueOnce({status_code: 403, message: 'no read access'});
        await fetchRenderPermissions(serverUrl, channelId);

        expect(RenderPermissionsStore.setEntry).toHaveBeenLastCalledWith(serverUrl, channelId, expect.any(Object), RENDER_PERMISSIONS_TTL_MS);
    });
});
