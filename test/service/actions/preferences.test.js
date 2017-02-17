// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import configureStore from 'app/store';

import * as Actions from 'service/actions/preferences';
import {login} from 'service/actions/users';
import Client from 'service/client';
import {Preferences, RequestStatus} from 'service/constants';

import TestHelper from 'test/test_helper';

describe('Actions.Preferences', () => {
    let store;
    before(async () => {
        await TestHelper.initBasic(Client);
    });

    beforeEach(() => {
        store = configureStore();
    });

    after(async () => {
        await TestHelper.basicClient.logout();
    });

    it('getMyPreferences', async () => {
        const user = TestHelper.basicUser;
        const existingPreferences = [
            {
                user_id: user.id,
                category: 'test',
                name: 'test1',
                value: 'test'
            },
            {
                user_id: user.id,
                category: 'test',
                name: 'test2',
                value: 'test'
            }
        ];

        await Client.savePreferences(existingPreferences);
        await Actions.getMyPreferences('1234')(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.preferences.getMyPreferences;
        const {myPreferences} = state.entities.preferences;

        if (request.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(request.error));
        }

        assert.ok(myPreferences['test--test1'], 'first preference doesn\'t exist');
        assert.deepEqual(existingPreferences[0], myPreferences['test--test1']);
        assert.ok(myPreferences['test--test2'], 'second preference doesn\'t exist');
        assert.deepEqual(existingPreferences[1], myPreferences['test--test2']);
    });

    it('savePrefrences', async () => {
        const user = TestHelper.basicUser;
        const existingPreferences = [
            {
                user_id: user.id,
                category: 'test',
                name: 'test1',
                value: 'test'
            }
        ];

        await Client.savePreferences(existingPreferences);
        await Actions.getMyPreferences()(store.dispatch, store.getState);

        const preferences = [
            {
                user_id: user.id,
                category: 'test',
                name: 'test2',
                value: 'test'
            },
            {
                user_id: user.id,
                category: 'test',
                name: 'test3',
                value: 'test'
            }
        ];

        await Actions.savePreferences(preferences)(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.preferences.savePreferences;
        const {myPreferences} = state.entities.preferences;

        if (request.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(request.error));
        }

        assert.ok(myPreferences['test--test1'], 'first preference doesn\'t exist');
        assert.deepEqual(existingPreferences[0], myPreferences['test--test1']);
        assert.ok(myPreferences['test--test2'], 'second preference doesn\'t exist');
        assert.deepEqual(preferences[0], myPreferences['test--test2']);
        assert.ok(myPreferences['test--test3'], 'third preference doesn\'t exist');
        assert.deepEqual(preferences[1], myPreferences['test--test3']);
    });

    it('deletePreferences', async () => {
        const user = TestHelper.basicUser;
        const existingPreferences = [
            {
                user_id: user.id,
                category: 'test',
                name: 'test1',
                value: 'test'
            },
            {
                user_id: user.id,
                category: 'test',
                name: 'test2',
                value: 'test'
            },
            {
                user_id: user.id,
                category: 'test',
                name: 'test3',
                value: 'test'
            }
        ];

        await Client.savePreferences(existingPreferences);
        await Actions.getMyPreferences()(store.dispatch, store.getState);
        await Actions.deletePreferences([
            existingPreferences[0],
            existingPreferences[2]
        ])(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.preferences.deletePreferences;
        const {myPreferences} = state.entities.preferences;

        if (request.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(request.error));
        }

        assert.ok(!myPreferences['test--test1'], 'deleted preference still exists');
        assert.ok(myPreferences['test--test2'], 'second preference doesn\'t exist');
        assert.deepEqual(existingPreferences[1], myPreferences['test--test2']);
        assert.ok(!myPreferences['test--test3'], 'third preference doesn\'t exist');
    });

    it('makeDirectChannelVisibleIfNecessary', async () => {
        const user = TestHelper.basicUser;
        const user2 = await TestHelper.createClient().createUser(TestHelper.fakeUser());

        await login(user.email, 'password1')(store.dispatch, store.getState);

        // Test that a new preference is created if non exists
        await Actions.makeDirectChannelVisibleIfNecessary(user2.id)(store.dispatch, store.getState);

        let state = store.getState();
        let myPreferences = state.entities.preferences.myPreferences;
        let preference = myPreferences[`${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}--${user2.id}`];
        assert.ok(preference, 'preference for showing direct channel doesn\'t exist');
        assert.equal(preference.value, 'true', 'preference for showing direct channel is not true');

        // Test that nothing changes if the preference already exists and is true
        await Actions.makeDirectChannelVisibleIfNecessary(user2.id)(store.dispatch, store.getState);

        const state2 = store.getState();
        assert.equal(state, state2, 'store should not change since direct channel is already visible');

        // Test that the preference is updated if it already exists and is false
        await Actions.savePreferences([{
            ...preference,
            value: 'false'
        }])(store.dispatch, store.getState);

        await Actions.makeDirectChannelVisibleIfNecessary(user2.id)(store.dispatch, store.getState);

        state = store.getState();
        myPreferences = state.entities.preferences.myPreferences;
        preference = myPreferences[`${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}--${user2.id}`];
        assert.ok(preference, 'preference for showing direct channel doesn\'t exist');
        assert.equal(preference.value, 'true', 'preference for showing direct channel is not true');
    }).timeout(2000);
});
