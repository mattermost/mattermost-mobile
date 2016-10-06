// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import configureStore from '../../store/configureStore';
import * as actions from '../general';
import Client from '../client';

describe('General Actions', () => {
    // it('getClientConfig', (done) => {
    //     const store = configureStore();
    //     store.subscribe(() => {
    //         expect(store.getState().entities.general.clientConfig.error).toEqual({});
    //         if (store.getState().entities.general.clientConfig.data.Version &&
    //             store.getState().entities.general.clientConfig.data.Version.length > 0) {
    //             done();
    //         }
    //     });

    //     actions.loadClientConfig()(store.dispatch, store.getState);
    // });

    it('Get ping basic success', (done) => {
        const store = configureStore();

        store.subscribe(() => {
            const ping = store.getState().entities.general.ping;

            if (ping.error) {
                done.fail(ping.error);
            } else if (!ping.loading) {
                done();
            }
        });

        Client.setUrl('https://pre-release.mattermost.com');
        actions.loadPing()(store.dispatch, store.getState);
    });


    it('Get ping fail with invalid url', (done) => {
        const store = configureStore();

        store.subscribe(() => {
            const ping = store.getState().entities.general.ping;

            if (!ping.loading && ping.error) {
                done();
            }
        });

        Client.setUrl('https://example.com');
        actions.loadPing()(store.dispatch, store.getState);
    });
});