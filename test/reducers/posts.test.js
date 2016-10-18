// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reducePosts, {initState} from 'reducers/posts';
import {PostsTypes as types} from 'constants';

describe('posts reducer', () => {
    describe('Init', () => {
        let store;
        let expectedStore;
        before(() => {
            store = reducePosts(store, {type: ''});
            expectedStore = {...initState};
        });
        it('should be initial state', () => {
            assert.equal(typeof store, 'object');
        });
        it('have a specifc initial state', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.FETCH_POSTS_REQUEST}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reducePosts(store, {
                type: types.FETCH_POSTS_REQUEST
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
    describe(`when ${types.FETCH_POSTS_SUCCESS}`, () => {
        let store;
        let expectedStore;
        const data = {id: '1', attrs: 'attrs'};
        before(() => {
            store = reducePosts(store, {
                type: types.FETCH_POSTS_SUCCESS,
                data: {
                    posts: data
                }
            });
            expectedStore = {
                ...initState,
                status: 'fetched',
                data
            };
        });
        it('should set status to fetched and data', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.FETCH_POSTS_FAILURE}`, () => {
        let store;
        let error;
        let expectedStore;
        before(() => {
            error = {id: 'the.error.id', message: 'Something went wrong'};
            store = reducePosts(store, {
                type: types.FETCH_POSTS_FAILURE,
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
