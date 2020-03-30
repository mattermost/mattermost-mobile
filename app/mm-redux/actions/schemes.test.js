// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';

import * as Actions from '@mm-redux/actions/schemes';
import {Client4} from '@mm-redux/client';

import TestHelper from 'test/test_helper';
import configureStore from 'test/test_store';

describe('Actions.Schemes', () => {
    let store;

    beforeAll(async () => {
        await TestHelper.initBasic(Client4);
    });

    beforeEach(async () => {
        store = await configureStore();
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('getSchemes', async () => {
        const mockScheme = TestHelper.basicScheme;

        nock(Client4.getBaseRoute()).
            get('/schemes').
            query(true).
            reply(200, [mockScheme]);

        await Actions.getSchemes()(store.dispatch, store.getState);
        const {schemes} = store.getState().entities.schemes;

        assert.ok(Object.keys(schemes).length > 0);
    });

    it('createScheme', async () => {
        const mockScheme = TestHelper.basicScheme;

        nock(Client4.getBaseRoute()).
            post('/schemes').
            reply(201, mockScheme);
        await Actions.createScheme(TestHelper.mockScheme())(store.dispatch, store.getState);

        const {schemes} = store.getState().entities.schemes;

        const schemeId = Object.keys(schemes)[0];
        assert.strictEqual(Object.keys(schemes).length, 1);
        assert.strictEqual(mockScheme.id, schemeId);
    });

    it('getScheme', async () => {
        nock(Client4.getBaseRoute()).
            get('/schemes/' + TestHelper.basicScheme.id).
            reply(200, TestHelper.basicScheme);

        await Actions.getScheme(TestHelper.basicScheme.id)(store.dispatch, store.getState);

        const state = store.getState();
        const {schemes} = state.entities.schemes;

        assert.equal(schemes[TestHelper.basicScheme.id].name, TestHelper.basicScheme.name);
    });

    it('patchScheme', async () => {
        const patchData = {name: 'The Updated Scheme', description: 'This is a scheme created by unit tests'};
        const scheme = {
            ...TestHelper.basicScheme,
            ...patchData,
        };

        nock(Client4.getBaseRoute()).
            put('/schemes/' + TestHelper.basicScheme.id + '/patch').
            reply(200, scheme);

        await Actions.patchScheme(TestHelper.basicScheme.id, scheme)(store.dispatch, store.getState);

        const state = store.getState();
        const {schemes} = state.entities.schemes;

        const updated = schemes[TestHelper.basicScheme.id];
        assert.ok(updated);
        assert.strictEqual(updated.name, patchData.name);
        assert.strictEqual(updated.description, patchData.description);
    });

    it('deleteScheme', async () => {
        nock(Client4.getBaseRoute()).
            delete('/schemes/' + TestHelper.basicScheme.id).
            reply(200, {status: 'OK'});

        await Actions.deleteScheme(TestHelper.basicScheme.id)(store.dispatch, store.getState);

        const state = store.getState();
        const {schemes} = state.entities.schemes;

        assert.notStrictEqual(schemes, {});
    });
});
