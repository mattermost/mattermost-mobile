// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MANAGED_CHANNEL_CATEGORIES_FIELD, MANAGED_CHANNEL_CATEGORIES_GROUP, MANAGED_LOCAL_CATEGORY_PREFIX} from '@constants/categories';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import EphemeralStore from '@store/ephemeral_store';

import {makeManagedCategoryId, computeManagedSortOrder, mergeManagedMappingsIntoSidebarCategories, fetchManagedCategoryPropertyIds} from './managed_categories_merge';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
}));
jest.mock('@queries/servers/categories', () => ({
    queryCategoriesByTeamIds: jest.fn().mockReturnValue({fetch: jest.fn().mockResolvedValue([])}),
}));
jest.mock('@utils/log', () => ({logDebug: jest.fn()}));

describe('managed_categories_merge helpers', () => {
    describe('makeManagedCategoryId', () => {
        it('should build id from prefix, teamId and displayName', () => {
            const id = makeManagedCategoryId('team1', 'Engineering');
            expect(id).toBe(`${MANAGED_LOCAL_CATEGORY_PREFIX}team1:Engineering`);
        });
    });

    describe('computeManagedSortOrder', () => {
        it('should return negative value for index 0', () => {
            expect(computeManagedSortOrder(0)).toBe(-10000);
        });

        it('should increment by 10 for each index', () => {
            expect(computeManagedSortOrder(1)).toBe(-9990);
            expect(computeManagedSortOrder(2)).toBe(-9980);
        });
    });

    describe('mergeManagedMappingsIntoSidebarCategories', () => {
        const serverUrl = 'http://test.server.com';
        const teamId = 'team1';
        let database: Database;

        beforeEach(async () => {
            jest.clearAllMocks();
            await DatabaseManager.init([serverUrl]);
            database = DatabaseManager.serverDatabases[serverUrl]!.database;
        });

        afterEach(async () => {
            await DatabaseManager.destroyServerDatabase(serverUrl);
        });

        it('should return serverCategories unchanged when mappings are empty', async () => {
            const serverCategories = [{id: 'cat1'} as CategoryWithChannels];
            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, serverCategories, {});
            expect(result).toEqual(serverCategories);
        });

        it('should prepend managed categories to server categories', async () => {
            const serverCategories = [{id: 'serverCat'} as CategoryWithChannels];
            const mappings = {ch1: 'Engineering', ch2: 'Engineering', ch3: 'Product'};

            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, serverCategories, mappings);

            expect(result.length).toBe(3); // 2 managed + 1 server
            expect(result[result.length - 1].id).toBe('serverCat');
        });

        it('should sort managed categories alphabetically by name', async () => {
            const mappings = {ch1: 'Zeta', ch2: 'Alpha', ch3: 'Beta'};
            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, [], mappings);

            expect(result[0].display_name).toBe('Alpha');
            expect(result[1].display_name).toBe('Beta');
            expect(result[2].display_name).toBe('Zeta');
        });

        it('should group channels with the same name into one category', async () => {
            const mappings = {ch1: 'Engineering', ch2: 'Engineering', ch3: 'Product'};
            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, [], mappings);

            const engineering = result.find((c) => c.display_name === 'Engineering')!;
            expect(engineering.channel_ids).toHaveLength(2);
            expect(engineering.channel_ids).toContain('ch1');
            expect(engineering.channel_ids).toContain('ch2');
        });

        it('should skip mappings with empty category names', async () => {
            const mappings = {ch1: '', ch2: 'Engineering'};
            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, [], mappings);

            expect(result.length).toBe(1);
            expect(result[0].display_name).toBe('Engineering');
        });

        it('should set type to custom and sorting to alpha', async () => {
            const mappings = {ch1: 'Engineering'};
            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, [], mappings);

            expect(result[0].type).toBe('custom');
            expect(result[0].sorting).toBe('alpha');
        });

        it('should assign correct sort_order values starting from index 0', async () => {
            const mappings = {ch1: 'Alpha', ch2: 'Beta'};
            const result = await mergeManagedMappingsIntoSidebarCategories(database, teamId, [], mappings);

            expect(result[0].sort_order).toBe(computeManagedSortOrder(0));
            expect(result[1].sort_order).toBe(computeManagedSortOrder(1));
        });
    });

    describe('fetchManagedCategoryPropertyIds', () => {
        const serverUrl = 'http://test.server.com';

        beforeEach(() => {
            jest.clearAllMocks();
            EphemeralStore.clearManagedCategoryPropertyIds(serverUrl);
        });

        it('should return cached value when available', async () => {
            const cached = {groupId: 'g1', fieldId: 'f1'};
            EphemeralStore.setManagedCategoryPropertyIds(serverUrl, cached);

            const result = await fetchManagedCategoryPropertyIds(serverUrl);

            expect(result).toEqual(cached);
            expect(NetworkManager.getClient).not.toHaveBeenCalled();
        });

        it('should fetch from API and cache result when not cached', async () => {
            const mockField: PropertyField = {
                id: 'field1',
                group_id: 'group1',
                name: MANAGED_CHANNEL_CATEGORIES_FIELD,
                type: 'text',
                target_type: 'system',
            } as PropertyField;
            const mockClient = {getPropertyFields: jest.fn().mockResolvedValue([mockField])};
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            const result = await fetchManagedCategoryPropertyIds(serverUrl);

            expect(mockClient.getPropertyFields).toHaveBeenCalledWith(MANAGED_CHANNEL_CATEGORIES_GROUP, 'channel', 'system');
            expect(result).toEqual({groupId: 'group1', fieldId: 'field1'});
            expect(EphemeralStore.getManagedCategoryPropertyIds(serverUrl)).toEqual({groupId: 'group1', fieldId: 'field1'});
        });

        it('should return undefined when API returns empty fields', async () => {
            const mockClient = {getPropertyFields: jest.fn().mockResolvedValue([])};
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            const result = await fetchManagedCategoryPropertyIds(serverUrl);

            expect(result).toBeUndefined();
        });

        it('should return undefined when required field is not in response', async () => {
            const mockClient = {
                getPropertyFields: jest.fn().mockResolvedValue([{id: 'f1', group_id: 'g1', name: 'other_field'}]),
            };
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            const result = await fetchManagedCategoryPropertyIds(serverUrl);

            expect(result).toBeUndefined();
        });

        it('should return undefined and log on network error', async () => {
            (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
                throw new Error('network error');
            });

            const result = await fetchManagedCategoryPropertyIds(serverUrl);

            expect(result).toBeUndefined();
        });
    });
});
