// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DefaultCallsConfig, type CallsConfigState} from '@calls/types/calls';

import {newLiveKitConnection} from './livekit/connection';
import {newRtcdConnection} from './rtcd/connection';

import {newCallConnection} from './index';

import type {IntlShape} from 'react-intl';

jest.mock('./livekit/connection', () => ({
    newLiveKitConnection: jest.fn(() => Promise.resolve('livekit-connection')),
}));
jest.mock('./rtcd/connection', () => ({
    newRtcdConnection: jest.fn(() => Promise.resolve('rtcd-connection')),
}));

describe('newCallConnection', () => {
    const serverUrl = 'https://server.example.com';
    const channelId = 'channel-id';
    const closeCb = jest.fn();
    const setScreenShareURL = jest.fn();
    const intl = {formatMessage: jest.fn()} as unknown as IntlShape;

    const configWithVersion = (version?: string): CallsConfigState => ({
        ...DefaultCallsConfig,
        version: {version},
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('connects over rtcd against a pre-2.0.0 plugin', async () => {
        const conn = await newCallConnection(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, configWithVersion('1.12.5'), 'title', 'root-id');

        expect(conn).toBe('rtcd-connection');
        expect(newRtcdConnection).toHaveBeenCalledWith(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, 'title', 'root-id');
        expect(newLiveKitConnection).not.toHaveBeenCalled();
    });

    it('connects over LiveKit against a 2.x plugin', async () => {
        const conn = await newCallConnection(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, configWithVersion('2.0.1-dev'), 'title', 'root-id');

        expect(conn).toBe('livekit-connection');
        expect(newLiveKitConnection).toHaveBeenCalledWith(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, 'title', 'root-id');
        expect(newRtcdConnection).not.toHaveBeenCalled();
    });
});
