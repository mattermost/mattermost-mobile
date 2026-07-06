// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    queryCategoriesById,
    queryCategoriesByTeamIds,
    queryCategoryChannelsByChannelId,
    queryCategoryChannelsByCategoryIds,
} from './categories';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'http://categories-query-test.com';

async function insertCategory(operator: ServerDataOperator, teamId: string) {
    const category = TestHelper.fakeCategoryWithId(teamId);
    await operator.handleCategories({categories: [category], prepareRecordsOnly: false});
    return category;
}

async function insertCategoryWithChannel(operator: ServerDataOperator, teamId: string, channelId: string) {
    const category = TestHelper.fakeCategoryWithId(teamId);
    await operator.handleCategories({categories: [category], prepareRecordsOnly: false});
    await operator.handleCategoryChannels({
        categoryChannels: [TestHelper.fakeCategoryChannelWithId(teamId, category.id, channelId)],
        prepareRecordsOnly: false,
    });
    return category;
}

describe('queryCategoriesById', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return matching categories by id', async () => {
        const cat1 = await insertCategory(operator, 'team1');
        const cat2 = await insertCategory(operator, 'team1');
        await insertCategory(operator, 'team1');

        const results = await queryCategoriesById(database, [cat1.id, cat2.id]).fetch();
        expect(results).toHaveLength(2);
        const ids = results.map((r) => r.id);
        expect(ids).toContain(cat1.id);
        expect(ids).toContain(cat2.id);
    });

    it('should return empty when no ids match', async () => {
        await insertCategory(operator, 'team1');

        const results = await queryCategoriesById(database, ['nonexistent']).fetch();
        expect(results).toHaveLength(0);
    });
});

describe('queryCategoriesByTeamIds', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return categories for the given team ids', async () => {
        await insertCategory(operator, 'team1');
        await insertCategory(operator, 'team1');
        await insertCategory(operator, 'team2');

        const results = await queryCategoriesByTeamIds(database, ['team1']).fetch();
        expect(results).toHaveLength(2);
        expect(results.every((r) => r.teamId === 'team1')).toBe(true);
    });

    it('should return categories for multiple team ids', async () => {
        await insertCategory(operator, 'team1');
        await insertCategory(operator, 'team2');
        await insertCategory(operator, 'team3');

        const results = await queryCategoriesByTeamIds(database, ['team1', 'team2']).fetch();
        expect(results).toHaveLength(2);
    });

    it('should return empty when team id does not exist', async () => {
        await insertCategory(operator, 'team1');

        const results = await queryCategoriesByTeamIds(database, ['nonexistent']).fetch();
        expect(results).toHaveLength(0);
    });
});

describe('queryCategoryChannelsByChannelId', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return category channels for the given channel id', async () => {
        const channelId = TestHelper.generateId();
        await insertCategoryWithChannel(operator, 'team1', channelId);

        const results = await queryCategoryChannelsByChannelId(database, channelId).fetch();
        expect(results).toHaveLength(1);
        expect(results[0].channelId).toBe(channelId);
    });

    it('should return empty when channel id is not in any category', async () => {
        const results = await queryCategoryChannelsByChannelId(database, 'nonexistent').fetch();
        expect(results).toHaveLength(0);
    });
});

describe('queryCategoryChannelsByCategoryIds', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return category channels for the given category ids', async () => {
        const ch1 = TestHelper.generateId();
        const ch2 = TestHelper.generateId();
        const cat1 = await insertCategoryWithChannel(operator, 'team1', ch1);
        const cat2 = await insertCategoryWithChannel(operator, 'team1', ch2);

        const results = await queryCategoryChannelsByCategoryIds(database, [cat1.id, cat2.id]).fetch();
        expect(results).toHaveLength(2);
        const catIds = results.map((r) => r.categoryId);
        expect(catIds).toContain(cat1.id);
        expect(catIds).toContain(cat2.id);
    });

    it('should return only channels belonging to the specified categories', async () => {
        const ch1 = TestHelper.generateId();
        const ch2 = TestHelper.generateId();
        const cat1 = await insertCategoryWithChannel(operator, 'team1', ch1);
        await insertCategoryWithChannel(operator, 'team1', ch2);

        const results = await queryCategoryChannelsByCategoryIds(database, [cat1.id]).fetch();
        expect(results).toHaveLength(1);
        expect(results[0].categoryId).toBe(cat1.id);
    });

    it('should return empty when no category ids match', async () => {
        const results = await queryCategoryChannelsByCategoryIds(database, ['nonexistent']).fetch();
        expect(results).toHaveLength(0);
    });
});
