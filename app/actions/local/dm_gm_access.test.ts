// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {DM_GM_ACCESS_ALLOWED, getDmGmAccessRecord} from '@queries/servers/dm_gm_access';
import {querySystemValue} from '@queries/servers/system';

import {clearDmGmAccessSeq, nextDmGmAccessSeq, storeDmGmAccess} from './dm_gm_access';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'dm-gm-access-local.test.com';
let operator: ServerDataOperator;

const readDenied = {start: true, read: false, write: true};

describe('storeDmGmAccess', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        clearDmGmAccessSeq(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should store the decisions and report the previous ones', async () => {
        const result = await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());

        expect(result).toEqual({stored: {previous: DM_GM_ACCESS_ALLOWED, access: readDenied}});
        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);
    });

    it('should drop an answer asked before the stored one', async () => {
        const older = nextDmGmAccessSeq();
        const newer = nextDmGmAccessSeq();

        await storeDmGmAccess(serverUrl, readDenied, newer);
        const result = await storeDmGmAccess(serverUrl, DM_GM_ACCESS_ALLOWED, older);

        expect(result).toEqual({stored: undefined});
        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);
    });

    it('should drop an older answer even when the newer one changed nothing', async () => {
        const older = nextDmGmAccessSeq();
        await storeDmGmAccess(serverUrl, DM_GM_ACCESS_ALLOWED, nextDmGmAccessSeq());

        expect(await storeDmGmAccess(serverUrl, readDenied, older)).toEqual({stored: undefined});
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
    });

    it('should merge an updater into the stored decisions', async () => {
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        await storeDmGmAccess(serverUrl, (previous) => ({...previous, write: false}), nextDmGmAccessSeq());

        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: true, read: false, write: false});
    });

    it('should not write unchanged decisions', async () => {
        const result = await storeDmGmAccess(serverUrl, DM_GM_ACCESS_ALLOWED, nextDmGmAccessSeq());

        expect(result).toEqual({stored: {previous: DM_GM_ACCESS_ALLOWED, access: DM_GM_ACCESS_ALLOWED}});
        expect(await querySystemValue(operator.database, SYSTEM_IDENTIFIERS.DM_GM_ACCESS).fetchCount()).toBe(0);
    });

    it('should return an error for an unknown server', async () => {
        const result = await storeDmGmAccess('unknown.test.com', readDenied, nextDmGmAccessSeq());

        expect(result.error).toBeDefined();
    });
});
