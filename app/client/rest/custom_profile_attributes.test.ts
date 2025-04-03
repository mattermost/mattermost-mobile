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
            `${client.getCustomProfileAttributesRoute()}/fields`,
            {method: 'get'},
        );
    });

    test('getCustomProfileAttributeValues', async () => {
        const userId = 'user1';
        await client.getCustomProfileAttributeValues(userId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getUserRoute(userId)}/custom_profile_attributes`,
            {method: 'get'},
        );
    });

    test('updateCustomProfileAttributeValues', async () => {
        const values = {
            field_1: 'value1',
            field_2: 'value2',
        };
        await client.updateCustomProfileAttributeValues(values);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getCustomProfileAttributesRoute()}/values`,
            {
                method: 'patch',
                body: values,
            },
        );
    });
});
