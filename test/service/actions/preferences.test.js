// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/preferences';
import Client from 'service/client';
import configureStore from 'app/store';
import {RequestStatus} from 'service/constants';
import TestHelper from 'test/test_helper';

describe('Actions.Preferences', () => {
    it('getMyPreferences', (done) => {
        TestHelper.initBasic(Client).then(async ({user}) => {
            const store = configureStore();

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

            store.subscribe(() => {
                const state = store.getState();
                const request = state.requests.preferences.getMyPreferences;

                if (request.status === RequestStatus.SUCCESS) {
                    const myPreferences = state.entities.preferences.myPreferences;

                    assert.ok(myPreferences['test--test1'], 'first preference doesn\'t exist');
                    assert.deepEqual(existingPreferences[0], myPreferences['test--test1']);
                    assert.ok(myPreferences['test--test2'], 'second preference doesn\'t exist');
                    assert.deepEqual(existingPreferences[1], myPreferences['test--test2']);

                    done();
                } else if (request.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(request.error)));
                }
            });

            Actions.getMyPreferences('1234')(store.dispatch, store.getState);
        });
    });

    it('savePrefrences', (done) => {
        TestHelper.initBasic(Client).then(async ({user}) => {
            const store = configureStore();

            const existingPreferences = [
                {
                    user_id: user.id,
                    category: 'test',
                    name: 'test1',
                    value: 'test'
                }
            ];

            await Client.savePreferences(existingPreferences);
            Actions.getMyPreferences()(store.dispatch, store.getState);

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

            store.subscribe(() => {
                const state = store.getState();
                const request = state.requests.preferences.savePreferences;

                if (request.status === RequestStatus.SUCCESS) {
                    const myPreferences = state.entities.preferences.myPreferences;

                    assert.ok(myPreferences['test--test1'], 'first preference doesn\'t exist');
                    assert.deepEqual(existingPreferences[0], myPreferences['test--test1']);
                    assert.ok(myPreferences['test--test2'], 'second preference doesn\'t exist');
                    assert.deepEqual(preferences[0], myPreferences['test--test2']);
                    assert.ok(myPreferences['test--test3'], 'third preference doesn\'t exist');
                    assert.deepEqual(preferences[1], myPreferences['test--test3']);

                    done();
                } else if (request.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(request.error)));
                }
            });

            Actions.savePreferences(preferences)(store.dispatch, store.getState);
        });
    });

    it('deletePreferences', (done) => {
        TestHelper.initBasic(Client).then(async ({user}) => {
            const store = configureStore();

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
            Actions.getMyPreferences()(store.dispatch, store.getState);

            store.subscribe(() => {
                const state = store.getState();
                const request = state.requests.preferences.deletePreferences;

                if (request.status === RequestStatus.SUCCESS) {
                    const myPreferences = state.entities.preferences.myPreferences;

                    assert.ok(!myPreferences['test--test1'], 'deleted preference still exists');
                    assert.ok(myPreferences['test--test2'], 'second preference doesn\'t exist');
                    assert.deepEqual(existingPreferences[1], myPreferences['test--test2']);
                    assert.ok(!myPreferences['test--test3'], 'third preference doesn\'t exist');

                    done();
                } else if (request.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(request.error)));
                }
            });

            Actions.deletePreferences([existingPreferences[0], existingPreferences[2]])(store.dispatch, store.getState);
        });
    });
});
