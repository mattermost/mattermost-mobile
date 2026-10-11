// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {nextDmGmAccessSeq, storeDmGmAccess} from '@actions/local/dm_gm_access';
import {License, ServerErrors} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {DM_GM_ACCESS_ALLOWED, getDmGmAccessRecord} from '@queries/servers/dm_gm_access';
import {RENDER_PERMISSIONS_RETRY_MS} from '@store/render_permissions_store';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import {clearDmGmAccessState, fetchDmGmAccess, handleDmGmPolicyError} from './dm_gm_access';
import {forceLogoutIfNecessary} from './session';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('./session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

const serverUrl = 'dm-gm-access-remote.test.com';
let operator: ServerDataOperator;

const mockClient = {
    searchPermissionActionDecisions: jest.fn(),
};

const response = (decisions: Record<string, RenderPermissionDecision>): ActionSearchResponse => ({
    resource: {type: 'permission', id: ''},
    results: [],
    decisions,
});

const allowedDecision = {allowed: true, evaluated: true};
const deniedDecision = {allowed: false, evaluated: true};
const failedDecision = {allowed: false, evaluated: true, reason: 'restricted_by_policy'};

const readDenied = {start: true, read: false, write: true};

const serverError = (serverErrorId: string) => ({server_error_id: serverErrorId, status_code: 403, message: 'denied'});

const storeConfig = async (config: Record<string, string>) => {
    await operator.handleConfigs({
        configs: Object.entries(config).map(([id, value]) => ({id, value})),
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
};

const storeLicense = (skuShortName: string) => operator.handleSystem({
    systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: skuShortName}}],
    prepareRecordsOnly: false,
});

const enforcedOnServer = async (version: string) => {
    await storeConfig({
        Version: version,
        FeatureFlagPermissionPolicies: 'true',
        EnableAttributeBasedAccessControl: 'true',
    });
    await storeLicense(License.SKU_SHORT_NAME.EnterpriseAdvanced);
};

// The retry runs a whole fetch, whose database reads each take a tick.
const flush = async () => {
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(process.nextTick);
    }
};

describe('fetchDmGmAccess', () => {
    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        mockClient.searchPermissionActionDecisions.mockReset();
    });

    afterEach(async () => {
        clearDmGmAccessState(serverUrl);
        disableFakeTimers();
        jest.clearAllMocks();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should map the decisions and store them', async () => {
        await enforcedOnServer('12.1.0');
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({
            dm_gm_start: deniedDecision,
            dm_gm_read_access: allowedDecision,

            // Not evaluated: the action's default, allowed, applies.
            dm_gm_write_access: {allowed: false, evaluated: false},
        }));

        const result = await fetchDmGmAccess(serverUrl, false, 'Cold Start');

        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledWith('Cold Start');
        expect(result.dmGmAccess?.access).toEqual({start: false, read: true, write: true});
        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: false, read: true, write: true});
    });

    it('should return the decisions without storing them when fetching only', async () => {
        await enforcedOnServer('12.1.0');
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({dm_gm_read_access: deniedDecision}));

        const result = await fetchDmGmAccess(serverUrl, true);

        expect(result).toEqual({dmGmAccess: {access: readDenied, seq: expect.any(Number)}});
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
    });

    it('should reset the decisions to allowed without asking an older server, or one not enforcing the policies', async () => {
        await enforcedOnServer('12.0.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        await fetchDmGmAccess(serverUrl);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        await storeConfig({Version: '12.1.0'});
        await storeLicense(License.SKU_SHORT_NAME.Enterprise);
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        await fetchDmGmAccess(serverUrl);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        expect(mockClient.searchPermissionActionDecisions).not.toHaveBeenCalled();
    });

    it('should keep the previous value of a decision with a reason and ask again with backoff', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({
            dm_gm_start: deniedDecision,
            dm_gm_read_access: failedDecision,
            dm_gm_write_access: allowedDecision,
        }));

        await fetchDmGmAccess(serverUrl);
        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: false, read: false, write: true});

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);

        // The second consecutive failure waits twice as long.
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);

        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({dm_gm_read_access: allowedDecision}));
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(3);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        // A clean answer ends the retries.
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS * 4);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(3);
    });

    it('should treat a 400 as a server without the decisions, allowing everything without asking again', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockRejectedValue({status_code: 400, message: 'invalid resource type'});

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.dmGmAccess?.access).toEqual(DM_GM_ACCESS_ALLOWED);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(1);
    });

    it('should keep the decisions on a refusal without asking again', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockRejectedValue({status_code: 403, message: 'forbidden'});

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.error).toBeDefined();
        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(1);
    });

    it('should keep the decisions on a network error and ask again, until the server is torn down', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockRejectedValue(new Error('network down'));

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.error).toBeDefined();
        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);

        clearDmGmAccessState(serverUrl);
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS * 2);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);
    });

    it('should log out on a 401', async () => {
        await enforcedOnServer('12.1.0');
        const error = {status_code: 401, message: 'unauthorized', url: `${serverUrl}/api/v4/access_control/decisions/actions/search`};
        mockClient.searchPermissionActionDecisions.mockRejectedValue(error);

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.error).toBe(error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });

    it('should drop an answer that lands after a newer one', async () => {
        await enforcedOnServer('12.1.0');
        let resolveFirst: (value: ActionSearchResponse) => void = () => undefined;
        mockClient.searchPermissionActionDecisions.
            mockReturnValueOnce(new Promise((resolve) => {
                resolveFirst = resolve;
            })).
            mockResolvedValueOnce(response({dm_gm_read_access: deniedDecision}));

        const first = fetchDmGmAccess(serverUrl);
        await fetchDmGmAccess(serverUrl);
        resolveFirst(response({dm_gm_read_access: allowedDecision}));
        await first;

        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);
    });
});

describe('handleDmGmPolicyError', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        clearDmGmAccessState(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it.each([
        [ServerErrors.DM_GM_START_DENIED, {start: false, read: true, write: true}],
        [ServerErrors.DM_GM_READ_ACCESS_DENIED, {start: true, read: false, write: true}],
        [ServerErrors.DM_GM_WRITE_ACCESS_DENIED, {start: true, read: true, write: false}],
    ])('should record the action %s names as denied', async (serverErrorId, expected) => {
        await handleDmGmPolicyError(serverUrl, serverError(serverErrorId));

        expect(await getDmGmAccessRecord(operator.database)).toEqual(expected);
    });

    it('should keep the other decisions', async () => {
        await handleDmGmPolicyError(serverUrl, serverError(ServerErrors.DM_GM_READ_ACCESS_DENIED));
        await handleDmGmPolicyError(serverUrl, {details: serverError(ServerErrors.DM_GM_WRITE_ACCESS_DENIED)});

        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: true, read: false, write: false});
    });

    it('should ignore any other error', async () => {
        await handleDmGmPolicyError(serverUrl, serverError(ServerErrors.CHANNEL_WRITE_ACCESS_DENIED));
        await handleDmGmPolicyError(serverUrl, new Error('network down'));

        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
    });
});
