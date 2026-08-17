// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeCurrentUser, observeUser} from './user';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type UserModel from '@typings/database/models/servers/user';

const serverUrl = 'observeUser.test.com';
let operator: ServerDataOperator;

const user: UserProfile = TestHelper.fakeUser({
    id: 'userid',
    username: 'username',
    roles: '',
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('observeUser', () => {
    const setCustomStatus = async (model: UserModel, value: string) => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await database.write(async () => {
            await model.update((u) => {
                u.props = {...u.props, customStatus: value};
            });
        });
    };

    it('should emit the latest props after successive writes', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        const model = models[0];

        const seen: Array<string | undefined> = [];
        const subscription = observeUser(database, user.id).subscribe((u) => {
            seen.push(u?.props?.customStatus);
        });

        // Set a status, then clear it — the account custom-status flow.
        await setCustomStatus(model, JSON.stringify({emoji: 'calendar', text: 'In a meeting'}));
        await setCustomStatus(model, '');

        await TestHelper.wait(50);
        subscription.unsubscribe();

        // The subscriber must end holding the cleared value, otherwise a consumer
        // rendering from this prop keeps showing a status the database no longer has.
        expect(seen[seen.length - 1]).toBe('');
    });

    it('should emit the latest props when the currentUserId observable re-emits concurrently', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        const model = models[0];
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}],
            prepareRecordsOnly: false,
        });

        const seen: Array<string | undefined> = [];
        const subscription = observeCurrentUser(database).subscribe((u) => {
            seen.push(u?.props?.customStatus);
        });

        await setCustomStatus(model, JSON.stringify({emoji: 'calendar', text: 'In a meeting'}));

        // observeCurrentUserId has no distinctUntilChanged, so rewriting the system
        // record re-emits and switchMap tears down the inner user subscription. Do it
        // concurrently with the clear so the write can land inside that window.
        await Promise.all([
            operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}],
                prepareRecordsOnly: false,
            }),
            setCustomStatus(model, ''),
        ]);

        await TestHelper.wait(50);
        subscription.unsubscribe();

        expect(seen[seen.length - 1]).toBe('');
    });

    it('should not drop emissions under rapid successive writes', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        const model = models[0];

        const seen: Array<string | undefined> = [];
        const subscription = observeUser(database, user.id).subscribe((u) => {
            seen.push(u?.props?.customStatus);
        });

        for (let i = 0; i < 20; i++) {
            // eslint-disable-next-line no-await-in-loop
            await setCustomStatus(model, `status-${i}`);
        }
        await setCustomStatus(model, '');

        await TestHelper.wait(50);
        subscription.unsubscribe();

        expect(seen[seen.length - 1]).toBe('');
    });
});
