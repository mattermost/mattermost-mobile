// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reduceDevice, {initState} from 'reducers/device';
import {DeviceTypes as types} from 'constants';

describe('device reducer', () => {
    describe('Init', () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceDevice(store, {type: ''});
            expectedStore = {...initState};
        });
        it('should be initial state', () => {
            assert.equal(typeof store, 'object');
        });
        it('have a specifc initial state', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.DEVICE_REQUEST}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceDevice(store, {
                type: types.DEVICE_REQUEST
            });
            expectedStore = {
                ...initState,
                loading: true
            };
        });
        it('should set status to fetching', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.DEVICE_SUCCESS}`, () => {
        let store;
        let expectedStore;
        const data = {some: 'data'};
        before(() => {
            store = reduceDevice(store, {
                type: types.DEVICE_SUCCESS,
                data
            });
            expectedStore = {
                ...initState,
                loading: false,
                data
            };
        });
        it('should set status to fetched and data', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.DEVICE_FAILURE}`, () => {
        let store;
        let error;
        let expectedStore;
        before(() => {
            error = {id: 'the.error.id', message: 'Something went wrong'};
            store = reduceDevice(store, {
                type: types.DEVICE_FAILURE,
                error
            });
            expectedStore = {
                ...initState,
                loading: false,
                error
            };
        });
        it('should set status to failed and error', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
});
