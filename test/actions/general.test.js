// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/general.js';
import Client from 'client/client_instance.js';
import configureStore from 'store/configureStore.js';
import TestHelper from 'test_helper.js';

describe('Actions.General', () => {
    it('getClientConfig', (done) => {
        TestHelper.initClient(Client, () => {
            const store = configureStore();

            store.subscribe(() => {
                const clientConfig = store.getState().entities.general.clientConfig;

                if (!clientConfig.loading) {
                    if (clientConfig.error) {
                        done(new Error(clientConfig.error));
                    } else {
                        // Check a few basic fields since they may change over time
                        assert.ok(clientConfig.data.Version);
                        assert.ok(clientConfig.data.BuildNumber);
                        assert.ok(clientConfig.data.BuildDate);
                        assert.ok(clientConfig.data.BuildHash);

                        done();
                    }
                }
            });

            Actions.getClientConfig()(store.dispatch, store.getState);
        });
    });

    it('getPing', (done) => {
        TestHelper.initClient(Client, () => {
            const store = configureStore();

            store.subscribe(() => {
                const ping = store.getState().entities.general.ping;

                if (ping.error) {
                    done(new Error(ping.error));
                } else if (!ping.loading) {
                    done();
                }
            });

            Actions.getPing()(store.dispatch, store.getState);
        });
    });

    it('getPing - Invalid URL', (done) => {
        TestHelper.initClient(Client, () => {
            const store = configureStore();

            store.subscribe(() => {
                const ping = store.getState().entities.general.ping;

                if (!ping.loading && ping.error) {
                    done();
                }
            });

            Client.setUrl('https://example.com/fake/url');
            Actions.getPing()(store.dispatch, store.getState);
        });
    });
});
