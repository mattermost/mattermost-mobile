// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {IntlProvider} from 'react-intl';
import InCallManager from 'react-native-incall-manager';

import {Client4} from '@client/rest';
import configureStore from '@test/test_store';
import * as PermissionUtils from '@utils/permission';

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
        getCallsConfig: jest.fn(() => ({
            ICEServersConfigs: [{
                urls: 'stun:stun1.example.com',
            },
            ],
            AllowEnableCalls: true,
            DefaultEnabled: true,
            last_retrieved_at: 1234,
        })),
        getPluginsManifests: jest.fn(() => (
            [
                {id: 'playbooks'},
                {id: 'com.mattermost.calls'},
            ]
        )),
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
    InCallManager.setSpeakerphoneOn = jest.fn();
    const intlProvider = new IntlProvider({locale: 'en'}, {});
    const {intl} = intlProvider.getChildContext();
    jest.spyOn(PermissionUtils, 'hasMicrophonePermission').mockReturnValue(true);

    beforeEach(async () => {
        newClient.mockClear();
        Client4.setUrl.mockClear();
        Client4.getCalls.mockClear();
        Client4.getCallsConfig.mockClear();
        Client4.enableChannelCalls.mockClear();
        Client4.disableChannelCalls.mockClear();
        store = await configureStore();
    });

    it('joinCall', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        const response = await store.dispatch(CallsActions.joinCall('channel-id', intl));
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

        await store.dispatch(CallsActions.joinCall('channel-id', intl));
        let result = store.getState().entities.calls.joined;
        assert.equal('channel-id', result);

        expect(CallsActions.ws.disconnect).not.toBeCalled();
        const disconnectMock = CallsActions.ws.disconnect;
        await store.dispatch(CallsActions.leaveCall());

        // ws.disconnect calls the callback, which is what sends the CallsTypes.RECEIVED_MYSELF_LEFT_CALL action.
        expect(disconnectMock).toBeCalled();
        await store.dispatch({type: CallsTypes.RECEIVED_MYSELF_LEFT_CALL});
        expect(CallsActions.ws).toBe(null);

        result = store.getState().entities.calls.joined;
        assert.equal(result, '');
    });

    it('muteMyself', async () => {
        await store.dispatch(addFakeCall('channel-id'));
        await store.dispatch(CallsActions.joinCall('channel-id', intl));
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

    it('loadConfig', async () => {
        await store.dispatch(CallsActions.loadConfig());
        expect(Client4.getCallsConfig).toBeCalledWith();
        assert.equal(store.getState().entities.calls.config.DefaultEnabled, true);
        assert.equal(store.getState().entities.calls.config.AllowEnableCalls, true);
    });

    it('batchLoadConfig', async () => {
        await store.dispatch(CallsActions.batchLoadCalls());
        expect(Client4.getPluginsManifests).toBeCalledWith();
        expect(Client4.getCallsConfig).toBeCalledWith();
        expect(Client4.getCalls).toBeCalledWith();

        // For some reason the above await is not working. This helps us:
        await store.dispatch(CallsActions.enableChannelCalls('channel-1'));

        assert.equal(store.getState().entities.calls.config.DefaultEnabled, true);
        assert.equal(store.getState().entities.calls.config.AllowEnableCalls, true);
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
