// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import configureStore from '../../store/configureStore';
import * as actions from '../general';
import Client from '../client';

describe('General Actions', () => {
    Client.setUrl('https://pre-release.mattermost.com');

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

    // it('Get ping basic success', (done) => {
    //     const store = configureStore();
    //     store.subscribe(() => {
    //         expect(store.getState().entities.general.ping.error).toEqual({});
    //         if (store.getState().entities.general.ping.data.version &&
    //             store.getState().entities.general.ping.data.version.length > 0) {
    //             done();
    //         }
    //     });

    //     actions.loadPing()(store.dispatch, store.getState);
    // });

    Client.setUrl('https://xxxx.mattermostxxx.com');
    it('Get ping fail with invalid url', (done) => {
        const store = configureStore();
        store.subscribe(() => {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> hello');
            console.log(store.getState().entities.general.ping);
            expect(store.getState().entities.general.ping.error).toEqual({});
            if (store.getState().entities.general.ping.data.version &&
                store.getState().entities.general.ping.data.version.length > 0) {
                done();
            }
        });

        actions.loadPing()(store.dispatch, store.getState);
    });
    //Client.setUrl('https://pre-release.mattermost.com');
});