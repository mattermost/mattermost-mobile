// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientChannelsMix} from './channels';

describe('ClientBase route methods', () => {
    let client: ClientChannelsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
    });

    describe('shared channels and remote cluster routes', () => {
        test('getSharedChannelsRoute returns sharedchannels path', () => {
            expect(client.getSharedChannelsRoute()).toBe(`${client.urlVersion}/sharedchannels`);
        });

        test('getRemoteClustersRoute returns remotecluster path', () => {
            expect(client.getRemoteClustersRoute()).toBe(`${client.urlVersion}/remotecluster`);
        });

        test('getChannelRemotesRoute returns channel remotes path', () => {
            const channelId = 'channel-id-1';
            expect(client.getChannelRemotesRoute(channelId)).toBe(
                `${client.urlVersion}/sharedchannels/${channelId}/remotes`,
            );
        });

        test('getRemoteClusterChannelRoute returns remote cluster channel path', () => {
            const remoteId = 'remote-id-1';
            const channelId = 'channel-id-1';
            expect(client.getRemoteClusterChannelRoute(remoteId, channelId)).toBe(
                `${client.urlVersion}/remotecluster/${remoteId}/channels/${channelId}`,
            );
        });
    });
});
