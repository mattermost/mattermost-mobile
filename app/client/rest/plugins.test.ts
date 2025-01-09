// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientPluginsMix} from './plugins';

describe('ClientPlugins', () => {
    let client: ClientPluginsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getPluginsManifests', async () => {
        const expectedUrl = `${client.getPluginsRoute()}/webapp`;
        const expectedOptions = {
            method: 'get',
        };

        await client.getPluginsManifests();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
