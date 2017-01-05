// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import configureStore from 'app/store';

import Config from 'assets/config.json';

import * as Actions from 'service/actions/general';
import Client from 'service/client';
import {RequestStatus} from 'service/constants';

import TestHelper from 'test/test_helper';

describe('Actions.General', () => {
    let store;
    before(async () => {
        await TestHelper.initBasic(Client);
    });

    beforeEach(() => {
        store = configureStore();
    });

    after(async () => {
        await TestHelper.basicClient.logout();
    });

    it('getPing - Invalid URL', async () => {
        Client.setUrl('https://google.com/fake/url');
        await Actions.getPing()(store.dispatch, store.getState);

        const {server} = store.getState().requests.general;
        assert.ok(server.status === RequestStatus.FAILURE && server.error);
    });

    it('getPing', async () => {
        TestHelper.basicClient.setUrl(Config.DefaultServerUrl);
        await Actions.getPing()(store.dispatch, store.getState);

        const {server} = store.getState().requests.general;
        if (server.status === RequestStatus.FAILED) {
            throw new Error(JSON.stringify(server.error));
        }
    });

    it('getClientConfig', async () => {
        await Actions.getClientConfig()(store.dispatch, store.getState);

        const configRequest = store.getState().requests.general.config;
        if (configRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(configRequest.error));
        }

        const clientConfig = store.getState().entities.general.config;

        // Check a few basic fields since they may change over time
        assert.ok(clientConfig.Version);
        assert.ok(clientConfig.BuildNumber);
        assert.ok(clientConfig.BuildDate);
        assert.ok(clientConfig.BuildHash);
    });

    it('getLicenseConfig', async () => {
        await Actions.getLicenseConfig()(store.dispatch, store.getState);

        const licenseRequest = store.getState().requests.general.license;
        if (licenseRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(licenseRequest.error));
        }

        const licenseConfig = store.getState().entities.general.license;

        // Check a few basic fields since they may change over time
        assert.notStrictEqual(licenseConfig.IsLicensed, undefined);
    });
});
