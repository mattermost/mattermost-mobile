// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/preferences';
import Client from 'service/client';
import configureStore from 'app/store';
import {RequestStatus} from 'service/constants';
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
});
