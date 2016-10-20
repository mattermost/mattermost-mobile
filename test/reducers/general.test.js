// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reduceGeneral, {initState} from 'reducers/general';
import {GeneralTypes as types} from 'constants';

const combinedState = {
    clientConfig: {...initState},
    ping: {...initState}
};

describe('general reducer', () => {
    describe('PING', () => {
        describe('Init', () => {
            let store;
            let expectedStore;
            before(() => {
                store = reduceGeneral(store, {type: ''});
                expectedStore = {...combinedState};
            });
            it('should be initial state', () => {
                assert.equal(typeof store, 'object');
            });
            it('have a specifc initial state', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
        describe(`when ${types.PING_REQUEST}`, () => {
            let store;
            let expectedStore;
            before(() => {
                store = reduceGeneral(store, {
                    type: types.PING_REQUEST
                });
                expectedStore = {
                    ...combinedState,
                    ping: {
                        ...combinedState.ping,
                        loading: true
                    }
                };
            });
            it('should set status to fetching', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
        describe(`when ${types.PING_SUCCESS}`, () => {
            let store;
            let expectedStore;
            const data = {some: 'data'};
            before(() => {
                store = reduceGeneral(store, {
                    type: types.PING_SUCCESS,
                    data
                });
                expectedStore = {
                    ...combinedState,
                    ping: {
                        ...combinedState.ping,
                        data
                    }
                };
            });
            it('should set status to fetched and data', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
        describe(`when ${types.PING_FAILURE}`, () => {
            let store;
            let error;
            let expectedStore;
            before(() => {
                error = {id: 'the.error.id', message: 'Something went wrong'};
                store = reduceGeneral(store, {
                    type: types.PING_FAILURE,
                    error
                });
                expectedStore = {
                    ...combinedState,
                    ping: {
                        ...combinedState.ping,
                        error
                    }
                };
            });
            it('should set status to failed and error', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
    });
    describe('CLIENT_CONFIG', () => {
        describe('Init', () => {
            let store;
            let expectedStore;
            before(() => {
                store = reduceGeneral(store, {type: ''});
                expectedStore = {...combinedState};
            });
            it('should be initial state', () => {
                assert.equal(typeof store, 'object');
            });
            it('have a specifc initial state', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
        describe(`when ${types.CLIENT_CONFIG_REQUEST}`, () => {
            let store;
            let expectedStore;
            before(() => {
                store = reduceGeneral(store, {
                    type: types.CLIENT_CONFIG_REQUEST
                });
                expectedStore = {
                    ...combinedState,
                    clientConfig: {
                        ...combinedState.clientConfig,
                        loading: true
                    }
                };
            });
            it('should set status to fetching', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
        describe(`when ${types.CLIENT_CONFIG_SUCCESS}`, () => {
            let store;
            let expectedStore;
            const data = {some: 'data'};
            before(() => {
                store = reduceGeneral(store, {
                    type: types.CLIENT_CONFIG_SUCCESS,
                    data
                });
                expectedStore = {
                    ...combinedState,
                    clientConfig: {
                        ...combinedState.clientConfig,
                        data
                    }
                };
            });
            it('should set status to fetched and data', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
        describe(`when ${types.CLIENT_CONFIG_FAILURE}`, () => {
            let store;
            let error;
            let expectedStore;
            before(() => {
                error = {id: 'the.error.id', message: 'Something went wrong'};
                store = reduceGeneral(store, {
                    type: types.CLIENT_CONFIG_FAILURE,
                    error
                });
                expectedStore = {
                    ...combinedState,
                    clientConfig: {
                        ...combinedState.clientConfig,
                        error
                    }
                };
            });
            it('should set status to failed and error', () => {
                assert.deepEqual(store, expectedStore);
            });
        });
    });
});
