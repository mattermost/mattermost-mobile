// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientPropertiesMix} from './properties';

describe('ClientProperties', () => {
    let client: ClientPropertiesMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getPropertyValues', async () => {
        const groupName = 'managed_channel_categories';
        const objectType = 'channel';
        const targetId = 'channel_id_1';
        const expectedUrl = `${client.urlVersion}/properties/groups/${groupName}/${objectType}/values/${targetId}`;
        const expectedOptions = {method: 'get'};

        await client.getPropertyValues<string>(groupName, objectType, targetId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getPropertyFields', async () => {
        const groupName = 'managed_channel_categories';
        const objectType = 'channel';
        const targetType = 'system';
        const expectedUrl = `${client.urlVersion}/properties/groups/${groupName}/${objectType}/fields?target_type=${targetType}`;
        const expectedOptions = {method: 'get'};

        await client.getPropertyFields(groupName, objectType, targetType);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
