// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';
import reduceTeams, {initState} from 'reducers/teams';
import {TeamsTypes as types} from 'constants';

describe('teams reducer', () => {
    describe('Init', () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceTeams(store, {type: ''});
            expectedStore = {...initState};
        });
        it('should be initial state', () => {
            assert.equal(typeof store, 'object');
        });
        it('have a specifc initial state', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.SELECT_TEAM}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceTeams(store, {
                type: types.SELECT_TEAM,
                teamId: '1'
            });
            expectedStore = {
                ...initState,
                currentTeamId: '1'
            };
        });
        it('should set status to fetching', () => {
            assert.deepEqual(store, expectedStore);
        });
    });
    describe(`when ${types.FETCH_TEAMS_REQUEST}`, () => {
        let store;
        let expectedStore;
        before(() => {
            store = reduceTeams(store, {
                type: types.FETCH_TEAMS_REQUEST
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
    describe(`when ${types.FETCH_TEAMS_SUCCESS}`, () => {
        let store;
        let data = {some: 'thing'};
        let expectedStore;
        before(() => {
            store = reduceTeams(store, {
                type: types.FETCH_TEAMS_SUCCESS,
                data
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
    describe(`when ${types.FETCH_TEAMS_FAILURE}`, () => {
        let store;
        let expectedStore;
        let error;
        before(() => {
            error = {id: 'the.error.id', message: 'Something went wrong'};
            store = reduceTeams(store, {
                type: types.FETCH_TEAMS_FAILURE,
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
