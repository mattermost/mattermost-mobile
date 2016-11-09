// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reduceLogout, {initState} from 'reducers/logout';
import {LogoutTypes} from 'constants';

describe('logout reducer', () => {
    describe('Init', () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceLogout(store, {type: ''});
            expectedStore = {...initState};
        });
        it('should be initial state', () => {
            assert.equal(typeof store, 'object');
        });
        it('have a specifc initial state', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${LogoutTypes.LOGOUT_REQUEST}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceLogout(store, {
                type: LogoutTypes.LOGOUT_REQUEST
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
    describe(`when ${LogoutTypes.LOGOUT_SUCCESS}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceLogout(store, {
                type: LogoutTypes.LOGOUT_SUCCESS
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
    describe(`when ${LogoutTypes.LOGOUT_FAILURE}`, () => {
        let store;
        let error;
        let expectedStore;
        before(() => {
            error = {id: 'the.error.id', message: 'Something went wrong'};
            store = reduceLogout(store, {
                type: LogoutTypes.LOGOUT_FAILURE,
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
