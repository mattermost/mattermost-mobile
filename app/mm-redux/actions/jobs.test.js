// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';

import * as Actions from '@mm-redux/actions/jobs';
import {Client4} from '@mm-redux/client';

import {RequestStatus} from '../constants';
import TestHelper from 'test/test_helper';
import configureStore from 'test/test_store';

const OK_RESPONSE = {status: 'OK'};

describe('Actions.Jobs', () => {
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

    it('createJob', async () => {
        const job = {
            type: 'data_retention',
        };

        nock(Client4.getBaseRoute()).
            post('/jobs').
            reply(201, {
                id: 'six4h67ja7ntdkek6g13dp3wka',
                create_at: 1491399241953,
                type: 'data_retention',
                status: 'pending',
                data: {},
            });

        await Actions.createJob(job)(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.jobs.createJob;
        if (request.status === RequestStatus.FAILURE) {
            throw new Error('createJob request failed');
        }

        const jobs = state.entities.jobs.jobs;
        assert.ok(jobs.six4h67ja7ntdkek6g13dp3wka);
    });

    it('getJob', async () => {
        nock(Client4.getBaseRoute()).
            get('/jobs/six4h67ja7ntdkek6g13dp3wka').
            reply(200, {
                id: 'six4h67ja7ntdkek6g13dp3wka',
                create_at: 1491399241953,
                type: 'data_retention',
                status: 'pending',
                data: {},
            });

        await Actions.getJob('six4h67ja7ntdkek6g13dp3wka')(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.jobs.getJob;
        if (request.status === RequestStatus.FAILURE) {
            throw new Error('getJob request failed');
        }

        const jobs = state.entities.jobs.jobs;
        assert.ok(jobs.six4h67ja7ntdkek6g13dp3wka);
    });

    it('cancelJob', async () => {
        nock(Client4.getBaseRoute()).
            post('/jobs/six4h67ja7ntdkek6g13dp3wka/cancel').
            reply(200, OK_RESPONSE);

        await Actions.cancelJob('six4h67ja7ntdkek6g13dp3wka')(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.jobs.cancelJob;
        if (request.status === RequestStatus.FAILURE) {
            throw new Error('cancelJob request failed');
        }
    });

    it('getJobs', async () => {
        nock(Client4.getBaseRoute()).
            get('/jobs').
            query(true).
            reply(200, [{
                id: 'six4h67ja7ntdkek6g13dp3wka',
                create_at: 1491399241953,
                type: 'data_retention',
                status: 'pending',
                data: {},
            }]);

        await Actions.getJobs()(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.jobs.getJobs;
        if (request.status === RequestStatus.FAILURE) {
            throw new Error('getJobs request failed');
        }

        const jobs = state.entities.jobs.jobs;
        assert.ok(jobs.six4h67ja7ntdkek6g13dp3wka);
    });

    it('getJobsByType', async () => {
        nock(Client4.getBaseRoute()).
            get('/jobs/type/data_retention').
            query(true).
            reply(200, [{
                id: 'six4h67ja7ntdkek6g13dp3wka',
                create_at: 1491399241953,
                type: 'data_retention',
                status: 'pending',
                data: {},
            }]);

        await Actions.getJobsByType('data_retention')(store.dispatch, store.getState);

        const state = store.getState();
        const request = state.requests.jobs.getJobs;
        if (request.status === RequestStatus.FAILURE) {
            throw new Error('getJobsByType request failed');
        }

        const jobs = state.entities.jobs.jobs;
        assert.ok(jobs.six4h67ja7ntdkek6g13dp3wka);

        const jobsByType = state.entities.jobs.jobsByTypeList;
        assert.ok(jobsByType.data_retention);
        assert.ok(jobsByType.data_retention.length === 1);
    });
});
