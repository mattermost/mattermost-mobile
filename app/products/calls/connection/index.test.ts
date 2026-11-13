// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CallsTransport} from '@calls/types/calls';

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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should connect over rtcd when given the rtcd transport', async () => {
        const conn = await newCallConnection(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, CallsTransport.Rtcd, 'title', 'root-id');

        expect(conn).toBe('rtcd-connection');
        expect(newRtcdConnection).toHaveBeenCalledWith(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, 'title', 'root-id');
        expect(newLiveKitConnection).not.toHaveBeenCalled();
    });

    it('should connect over LiveKit when given the LiveKit transport', async () => {
        const conn = await newCallConnection(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, CallsTransport.LiveKit, 'title', 'root-id');

        expect(conn).toBe('livekit-connection');
        expect(newLiveKitConnection).toHaveBeenCalledWith(serverUrl, channelId, closeCb, setScreenShareURL, true, intl, 'title', 'root-id');
        expect(newRtcdConnection).not.toHaveBeenCalled();
    });
});
