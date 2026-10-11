// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {General, License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';
import {getDirectChannelName} from '@utils/channel';

import {
    DM_GM_ACCESS_ALLOWED,
    getDmGmAccess,
    getDmGmAccessRecord,
    observeCanReadDmGm,
    observeCanSendDirectMessageTo,
    observeCanShareToDmGm,
    observeCanStartDmGm,
    observeCanWriteDmGm,
    observeDmGmAccess,
    observeHasDirectChannelWith,
    parseDmGmAccess,
} from './dm_gm_access';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'dm-gm-access.test.com';
const currentUserId = 'currentuserid';
let operator: ServerDataOperator;

const storeSystem = (id: string, value: unknown) => operator.handleSystem({systems: [{id, value}], prepareRecordsOnly: false});

const enforce = async () => {
    await operator.handleConfigs({
        configs: [
            {id: 'FeatureFlagPermissionPolicies', value: 'true'},
            {id: 'EnableAttributeBasedAccessControl', value: 'true'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
    await storeSystem(SYSTEM_IDENTIFIERS.LICENSE, {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced});
};

describe('dm_gm_access queries', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('parseDmGmAccess', () => {
        it('should allow everything for a missing or malformed record', () => {
            expect(parseDmGmAccess(undefined)).toEqual(DM_GM_ACCESS_ALLOWED);
            expect(parseDmGmAccess('denied')).toEqual(DM_GM_ACCESS_ALLOWED);
        });

        it('should deny a field only when it is stored as false', () => {
            expect(parseDmGmAccess({start: false, read: 0, write: 'false'})).toEqual({start: false, read: true, write: true});
        });
    });

    describe('getDmGmAccess', () => {
        it('should allow everything before any record is stored', async () => {
            await enforce();

            expect(await getDmGmAccess(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
        });

        it('should return the stored decisions while the policies are enforced', async () => {
            await enforce();
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: true, read: false, write: false});

            expect(await getDmGmAccess(operator.database)).toEqual({start: true, read: false, write: false});
        });

        it('should allow everything below Enterprise Advanced, while keeping the record', async () => {
            await enforce();
            await storeSystem(SYSTEM_IDENTIFIERS.LICENSE, {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.Enterprise});
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: false, read: false, write: false});

            expect(await getDmGmAccess(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
            expect(await getDmGmAccessRecord(operator.database)).toEqual({start: false, read: false, write: false});
        });
    });

    describe('observeDmGmAccess', () => {
        it('should allow everything while ABAC is off', async () => {
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: false, read: false, write: false});

            expect(await firstValueFrom(observeDmGmAccess(operator.database))).toEqual(DM_GM_ACCESS_ALLOWED);
        });

        it('should emit the stored decisions and their changes, sharing one stream per database', async () => {
            await enforce();
            const stream = observeDmGmAccess(operator.database);
            expect(observeDmGmAccess(operator.database)).toBe(stream);

            const next = jest.fn();
            const subscription = stream.subscribe({next});
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: true, read: false, write: true});

            await new Promise(process.nextTick);
            expect(next).toHaveBeenCalledTimes(2);
            expect(next).toHaveBeenNthCalledWith(1, DM_GM_ACCESS_ALLOWED);
            expect(next).toHaveBeenNthCalledWith(2, {start: true, read: false, write: true});
            subscription.unsubscribe();
        });
    });

    describe('observeCan*DmGm', () => {
        it('should map the decisions, starting only when Read is also allowed', async () => {
            await enforce();
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: true, read: false, write: false});

            expect(await firstValueFrom(observeCanReadDmGm(operator.database))).toBe(false);
            expect(await firstValueFrom(observeCanWriteDmGm(operator.database))).toBe(false);
            expect(await firstValueFrom(observeCanStartDmGm(operator.database))).toBe(false);

            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: true, read: true, write: false});
            expect(await firstValueFrom(observeCanStartDmGm(operator.database))).toBe(true);
        });

        it('should share into conversations only while both Read and Write are allowed', async () => {
            await enforce();
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: true, read: true, write: false});
            expect(await firstValueFrom(observeCanShareToDmGm(operator.database))).toBe(false);

            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: false, read: true, write: true});
            expect(await firstValueFrom(observeCanShareToDmGm(operator.database))).toBe(true);
        });
    });

    describe('observeCanSendDirectMessageTo', () => {
        beforeEach(async () => {
            await enforce();
            await storeSystem(SYSTEM_IDENTIFIERS.CURRENT_USER_ID, currentUserId);
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: 'dmchannelid', name: getDirectChannelName(currentUserId, 'otheruserid'), type: General.DM_CHANNEL, team_id: ''})],
                prepareRecordsOnly: false,
            });
        });

        it('should reopen an existing direct message without Start, but start a new one only with it', async () => {
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: false, read: true, write: true});

            expect(await firstValueFrom(observeCanSendDirectMessageTo(operator.database, 'otheruserid'))).toBe(true);
            expect(await firstValueFrom(observeCanSendDirectMessageTo(operator.database, 'strangerid'))).toBe(false);
        });

        it('should open none while Read is denied', async () => {
            await storeSystem(SYSTEM_IDENTIFIERS.DM_GM_ACCESS, {start: true, read: false, write: true});

            expect(await firstValueFrom(observeCanSendDirectMessageTo(operator.database, 'otheruserid'))).toBe(false);
        });
    });

    describe('observeHasDirectChannelWith', () => {
        it('should tell whether a direct message with the user is stored', async () => {
            await storeSystem(SYSTEM_IDENTIFIERS.CURRENT_USER_ID, currentUserId);
            const name = getDirectChannelName(currentUserId, 'otheruserid');
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: 'dmchannelid', name, type: General.DM_CHANNEL, team_id: ''})],
                prepareRecordsOnly: false,
            });

            expect(await firstValueFrom(observeHasDirectChannelWith(operator.database, 'otheruserid'))).toBe(true);
            expect(await firstValueFrom(observeHasDirectChannelWith(operator.database, 'strangerid'))).toBe(false);
        });
    });
});
