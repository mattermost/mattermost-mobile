// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientCustomAttributesMix} from './custom_profile_attributes';

describe('CustomAttributes', () => {
    let client: ClientCustomAttributesMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getCustomProfileAttributeFields', async () => {
        await client.getCustomProfileAttributeFields();

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getCustomProfileAttributesRoute(),
            {method: 'get'},
        );
    });

    test('getCustomProfileAttributeValues', async () => {
        const userId = 'user_id';
        await client.getCustomProfileAttributeValues(userId);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getUserRoute(userId),
            {method: 'get'},
        );
    });
});
