// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/channels';
import Client from 'client';
import configureStore from 'store/configureStore';
import {RequestStatus} from 'constants';
import TestHelper from 'test_helper';

describe('Actions.Channels', () => {
    it('fetchMyChannelsAndMembers', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const channels = store.getState().entities.channels.channels;
                const members = store.getState().entities.channels.myMembers;

                const channelsRequest = store.getState().requests.channels.channels;
                const membersRequest = store.getState().requests.channels.myMembers;

                if (channelsRequest.status === RequestStatus.SUCCESS && membersRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(channels);
                    assert.ok(members);
                    assert.ok(channels[Object.keys(members)[0]]);
                    assert.ok(members[Object.keys(channels)[0]]);
                    assert.equal(Object.keys(channels).length, Object.keys(members).length);
                    done();
                } else if (channelsRequest.status === RequestStatus.FAILURE && membersRequest.status === RequestStatus.FAILURE) {
                    return done(new Error(channelsRequest.error));
                }
            });

            Actions.fetchMyChannelsAndMembers(TestHelper.basicTeam.id)(store.dispatch, store.getState);
        });
    });
});
