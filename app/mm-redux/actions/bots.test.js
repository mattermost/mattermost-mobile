// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';

import * as BotActions from '@mm-redux/actions/bots';
import {Client4} from '@mm-redux/client';

import TestHelper from 'test/test_helper';
import configureStore from 'test/test_store';

describe('Actions.Bots', () => {
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

    it('loadBots', async () => {
        const bots = [TestHelper.fakeBot(), TestHelper.fakeBot()];
        nock(Client4.getBaseRoute()).
            get('/bots').
            query(true).
            reply(201, bots);

        await store.dispatch(BotActions.loadBots());

        const state = store.getState();
        const botsResult = state.entities.bots.accounts;
        assert.equal(bots.length, Object.values(botsResult).length);
    });

    it('loadBot', async () => {
        const bot = TestHelper.fakeBot();
        nock(Client4.getBaseRoute()).
            get(`/bots/${bot.user_id}`).
            query(true).
            reply(201, bot);

        await store.dispatch(BotActions.loadBot(bot.user_id));

        const state = store.getState();
        const botsResult = state.entities.bots.accounts[bot.user_id];
        assert.equal(bot.username, botsResult.username);
    });

    it('createBot', async () => {
        const bot = TestHelper.fakeBot();
        nock(Client4.getBaseRoute()).
            post('/bots').
            reply(200, bot);
        await store.dispatch(BotActions.createBot(bot));

        const state = store.getState();
        const botsResult = state.entities.bots.accounts[bot.user_id];
        assert.equal(bot.username, botsResult.username);
    });

    it('patchBot', async () => {
        const bot = TestHelper.fakeBot();
        nock(Client4.getBaseRoute()).
            post('/bots').
            reply(200, bot);
        await store.dispatch(BotActions.createBot(bot));

        bot.username = 'mynewusername';

        nock(Client4.getBaseRoute()).
            put(`/bots/${bot.user_id}`).
            reply(200, bot);
        await store.dispatch(BotActions.patchBot(bot.user_id, bot));

        const state = store.getState();
        const botsResult = state.entities.bots.accounts[bot.user_id];
        assert.equal(bot.username, botsResult.username);
    });

    it('disableBot', async () => {
        const bot = TestHelper.fakeBot();
        nock(Client4.getBaseRoute()).
            post('/bots').
            reply(200, bot);
        await store.dispatch(BotActions.createBot(bot));

        // Disable the bot by setting delete_at to a value > 0
        bot.delete_at = 1507840900065;
        nock(Client4.getBotRoute(bot.user_id)).
            post('/disable').
            reply(200, bot);
        await store.dispatch(BotActions.disableBot(bot.user_id));

        const state = store.getState();
        const botsResult = state.entities.bots.accounts[bot.user_id];
        assert.equal(bot.delete_at, botsResult.delete_at);

        bot.delete_at = 0;
        nock(Client4.getBotRoute(bot.user_id)).
            post('/enable').
            reply(200, bot);
        await store.dispatch(BotActions.enableBot(bot.user_id));

        const state2 = store.getState();
        const botsResult2 = state2.entities.bots.accounts[bot.user_id];
        assert.equal(bot.delete_at, botsResult2.delete_at);
    });

    it('assignBot', async () => {
        const bot = TestHelper.fakeBot();
        nock(Client4.getBaseRoute()).
            post('/bots').
            reply(200, bot);
        await store.dispatch(BotActions.createBot(bot));

        bot.owner_id = TestHelper.generateId();
        nock(Client4.getBotRoute(bot.user_id)).
            post('/assign/' + bot.owner_id).
            reply(200, bot);
        await store.dispatch(BotActions.assignBot(bot.user_id, bot.owner_id));

        const state = store.getState();
        const botsResult = state.entities.bots.accounts[bot.user_id];
        assert.equal(bot.owner_id, botsResult.owner_id);
    });
});
