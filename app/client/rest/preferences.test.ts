// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientPreferencesMix} from './preferences';

describe('ClientPreferences', () => {
    let client: ClientPreferencesMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('savePreferences', async () => {
        const userId = 'user_id';
        const preferences = [{category: 'category1', name: 'name1', value: 'value1'}] as PreferenceType[];
        const groupLabel = 'Server Switch';
        const expectedUrl = client.getPreferencesRoute(userId);
        const expectedOptions = {
            method: 'put',
            body: preferences,
            groupLabel,
        };

        await client.savePreferences(userId, preferences, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getMyPreferences', async () => {
        const groupLabel = 'Server Switch';
        const expectedUrl = client.getPreferencesRoute('me');
        const expectedOptions = {
            method: 'get',
            groupLabel,
        };

        await client.getMyPreferences(groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deletePreferences', async () => {
        const userId = 'user_id';
        const preferences = [{category: 'category1', name: 'name1', value: 'value1'}] as PreferenceType[];
        const expectedUrl = `${client.getPreferencesRoute(userId)}/delete`;
        const expectedOptions = {
            method: 'post',
            body: preferences,
        };

        await client.deletePreferences(userId, preferences);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
