// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reduceLogin, {initState} from 'reducers/login';
import {LoginTypes as types} from 'constants';

describe('login reducer', () => {
    describe('Init', () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceLogin(store, {type: ''});
            expectedStore = {...initState};
        });
        it('should be initial state', () => {
            assert.equal(typeof store, 'object');
        });
        it('have a specifc initial state', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.LOGIN_REQUEST}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceLogin(store, {
                type: types.LOGIN_REQUEST
            });
            expectedStore = {
                ...initState,
                status: 'fetching'
            };
        });
        it('should set status to fetching', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.LOGIN_SUCCESS}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceLogin(store, {
                type: types.LOGIN_SUCCESS
            });
            expectedStore = {
                ...initState,
                status: 'fetched'
            };
        });
        it('should set status to fetched and data', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.LOGIN_FAILURE}`, () => {
        let store;
        let error;
        let expectedStore;
        before(() => {
            error = {id: 'the.error.id', message: 'Something went wrong'};
            store = reduceLogin(store, {
                type: types.LOGIN_FAILURE,
                error
            });
            expectedStore = {
                ...initState,
                status: 'failed',
                error
            };
        });
        it('should set status to failed and error', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
});
