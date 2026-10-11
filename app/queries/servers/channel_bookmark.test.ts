// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {General, License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeCanAddBookmarks} from './channel_bookmark';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'channel-bookmark-queries.test.com';
const dmId = 'dmchannelid';

describe('observeCanAddBookmarks in a conversation', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleConfigs({
            configs: [
                {id: 'Version', value: '12.1.0'},
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        const user = TestHelper.fakeUser({id: 'userid1', roles: 'system_user'});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id},
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}},
            ],
            prepareRecordsOnly: false,
        });
        await operator.handleChannel({channels: [TestHelper.fakeChannel({id: dmId, type: General.DM_CHANNEL, team_id: ''})], prepareRecordsOnly: false});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should follow the DM/GM write decision', async () => {
        expect(await firstValueFrom(observeCanAddBookmarks(operator.database, dmId))).toBe(true);

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.DM_GM_ACCESS, value: {start: true, read: true, write: false}}], prepareRecordsOnly: false});

        expect(await firstValueFrom(observeCanAddBookmarks(operator.database, dmId))).toBe(false);
    });
});
