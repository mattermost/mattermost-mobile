// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Client4} from '@client/rest';
import TestHelper from '@test/test_helper';
import configureStore from '@test/test_store';

import CallsTypes from '../action_types/calls';

import * as CallsActions from './calls';

export function addFakeCall(channelId) {
    return {
        type: CallsTypes.RECEIVED_CALL_STARTED,
        data: {
            participants: {
                xohi8cki9787fgiryne716u84o: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: false},
                xohi8cki9787fgiryne716u841: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: true},
                xohi8cki9787fgiryne716u842: {id: 'xohi8cki9787fgiryne716u84o', isTalking: false, uted: false},
                xohi8cki9787fgiryne716u843: {id: 'xohi8cki9787fgiryne716u84o', isTalking: false, muted: true},
                xohi8cki9787fgiryne716u844: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: false},
                xohi8cki9787fgiryne716u845: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, muted: true},
            },
            channelId,
            startTime: (new Date()).getTime(),
        },
    };
}

describe('Actions.Calls', () => {
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

    it('joinCall', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(CallsActions.joinCall('channel-id'));
        const result = store.getState().entities.calls.joined;
        assert.equal('channel-id', result);
    });

    it('leaveCall', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(CallsActions.joinCall('channel-id'));
        let result = store.getState().entities.calls.joined;
        assert.equal('channel-id', result);
        await store.dispatch(CallsActions.leaveCall());
        result = store.getState().entities.calls.joined;
        assert.equal('', result);
    });
});
