// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientCategoriesMix} from './categories';

describe('ClientCategories', () => {
    let client: ClientCategoriesMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getCategories', async () => {
        const userId = 'user_id';
        const teamId = 'team_id';
        await client.getCategories(userId, teamId);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getCategoriesRoute(userId, teamId),
            {method: 'get', groupLabel: undefined},
        );
    });

    test('getCategoriesOrder', async () => {
        const userId = 'user_id';
        const teamId = 'team_id';
        await client.getCategoriesOrder(userId, teamId);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getCategoriesOrderRoute(userId, teamId),
            {method: 'get'},
        );
    });

    test('getCategory', async () => {
        const userId = 'user_id';
        const teamId = 'team_id';
        const categoryId = 'category_id';
        await client.getCategory(userId, teamId, categoryId);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getCategoryRoute(userId, teamId, categoryId),
            {method: 'get'},
        );
    });

    test('updateChannelCategories', async () => {
        const userId = 'user_id';
        const teamId = 'team_id';
        const categories = [{id: 'category_id', channel_ids: ['channel_id']}] as CategoryWithChannels[];
        await client.updateChannelCategories(userId, teamId, categories);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getCategoriesRoute(userId, teamId),
            {method: 'put', body: categories},
        );
    });
});
