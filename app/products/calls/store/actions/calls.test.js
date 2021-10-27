// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {Client4} from '@client/rest';
import configureStore from '@test/test_store';

import CallsTypes from '../action_types/calls';

import * as CallsActions from './calls';

jest.mock('@client/rest', () => ({
    Client4: {
        setUrl: jest.fn(),
        getCalls: jest.fn(() => [
            {
                call: {
                    users: ['user-1', 'user-2'],
                    states: {
                        'user-1': {unmuted: true},
                        'user-2': {unmuted: false},
                    },
                    start_at: 123,
                    screen_sharing_id: '',
                    thread_id: 'thread-1',
                },
                channel_id: 'channel-1',
                enabled: true,
            },
        ]),
        enableChannelCalls: jest.fn(() => null),
        disableChannelCalls: jest.fn(() => null),
    },
}));

jest.mock('@mmproducts/calls/connection', () => ({
    newClient: jest.fn(() => Promise.resolve({
        disconnect: jest.fn(),
        mute: jest.fn(),
        unmute: jest.fn(),
        waitForReady: jest.fn(() => Promise.resolve()),
    })),
}));

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
    const {newClient} = require('@mmproducts/calls/connection');

    beforeEach(async () => {
        newClient.mockClear();
        Client4.setUrl.mockClear();
        Client4.getCalls.mockClear();
        Client4.enableChannelCalls.mockClear();
        Client4.disableChannelCalls.mockClear();
        store = await configureStore();
    });

    it('joinCall', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        const response = await store.dispatch(CallsActions.joinCall('channel-id'));
        const result = store.getState().entities.calls.joined;
        assert.equal('channel-id', result);
        assert.equal(response.data, 'channel-id');
        expect(newClient).toBeCalled();
        expect(newClient.mock.calls[0][0]).toBe('channel-id');
        await store.dispatch(CallsActions.leaveCall());
    });

    it('leaveCall', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        expect(CallsActions.ws).toBe(null);

        await store.dispatch(CallsActions.joinCall('channel-id'));
        let result = store.getState().entities.calls.joined;
        assert.equal('channel-id', result);

        expect(CallsActions.ws.disconnect).not.toBeCalled();
        const disconnectMock = CallsActions.ws.disconnect;
        await store.dispatch(CallsActions.leaveCall());
        expect(disconnectMock).toBeCalled();
        expect(CallsActions.ws).toBe(null);

        result = store.getState().entities.calls.joined;
        assert.equal('', result);
    });

    it('muteMyself', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(CallsActions.joinCall('channel-id'));
        await store.dispatch(CallsActions.muteMyself());
        expect(CallsActions.ws.mute).toBeCalled();
        await store.dispatch(CallsActions.leaveCall());
    });

    it('unmuteMyself', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(CallsActions.joinCall('channel-id'));
        await store.dispatch(CallsActions.unmuteMyself());
        expect(CallsActions.ws.unmute).toBeCalled();
        await store.dispatch(CallsActions.leaveCall());
    });

    it('loadCalls', async () => {
        await store.dispatch(CallsActions.loadCalls());
        expect(Client4.getCalls).toBeCalledWith();
        assert.equal(store.getState().entities.calls.calls['channel-1'].channelId, 'channel-1');
        assert.equal(store.getState().entities.calls.enabled['channel-1'], true);
    });

    it('enableChannelCalls', async () => {
        assert.equal(store.getState().entities.calls.enabled['channel-1'], undefined);
        await store.dispatch(CallsActions.enableChannelCalls('channel-1'));
        expect(Client4.enableChannelCalls).toBeCalledWith('channel-1');
    });

    it('disableChannelCalls', async () => {
        assert.equal(store.getState().entities.calls.enabled['channel-1'], undefined);
        await store.dispatch(CallsActions.enableChannelCalls('channel-1'));
        assert.equal(store.getState().entities.calls.enabled['channel-1'], true);
        expect(Client4.disableChannelCalls).not.toBeCalledWith('channel-1');
        await store.dispatch(CallsActions.disableChannelCalls('channel-1'));
        expect(Client4.disableChannelCalls).toBeCalledWith('channel-1');
        assert.equal(store.getState().entities.calls.enabled['channel-1'], false);
    });
});
