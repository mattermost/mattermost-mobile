// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reduceChannels, {initState} from 'reducers/channels';
import {ChannelsTypes as types} from 'constants';

describe('channels reducer', () => {
    describe('Init', () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceChannels(store, {type: ''});
            expectedStore = {...initState};
        });
        it('should be initial state', () => {
            assert.equal(typeof store, 'object');
        });
        it('have a specifc initial state', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.SELECT_CHANNEL}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceChannels(store, {
                type: types.SELECT_CHANNEL,
                channelId: '1'
            });
            expectedStore = {
                ...initState,
                currentChannelId: '1'
            };
        });
        it('should set status to fetching', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.FETCH_CHANNELS_REQUEST}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceChannels(store, {
                type: types.FETCH_CHANNELS_REQUEST
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
    describe(`when ${types.FETCH_CHANNELS_SUCCESS}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceChannels(store, {
                type: types.FETCH_CHANNELS_SUCCESS,
                data: {channels: [{id: '1', attr: 'attr'}]}
            });
            expectedStore = {
                ...initState,
                status: 'fetched',
                data: {1: {id: '1', attr: 'attr'}}
            };
        });
        it('should set status to fetched and data', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.FETCH_CHANNELS_FAILURE}`, () => {
        let store;
        let expectedStore;
        let error;
        before(() => {
            error = {id: 'the.error.id', message: 'Something went wrong'};
            store = reduceChannels(store, {
                type: types.FETCH_CHANNELS_FAILURE,
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
