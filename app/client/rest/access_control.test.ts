// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type {ClientAccessControlMix} from './access_control';
import type ClientBase from './base';

describe('ClientAccessControl', () => {
    let client: ClientAccessControlMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    it('should search a channel in discovery mode, without an action list', async () => {
        await client.searchChannelActionDecisions('channel-id');

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/access_control/decisions/actions/search`,
            {method: 'post', body: {resource: {type: 'channel', id: 'channel-id'}}},
        );
    });
});
