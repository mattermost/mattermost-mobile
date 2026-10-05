// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {waitFor} from '@testing-library/react-native';
import {defer, type Subscription} from 'rxjs';

import DatabaseManager from '@database/manager';
import * as PreferenceQueries from '@queries/servers/preference';
import TestHelper from '@test/test_helper';

import {observeFlattenedCategories, type FlattenedCategoriesData} from './observe_flattened_categories';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Database from '@nozbe/watermelondb/Database';

describe('observeFlattenedCategories', () => {
    const serverUrl = 'http://www.observe-flattened-categories.com';
    let database: Database;
    let operator: ServerDataOperator;
    let subscription: Subscription | undefined;
    let preferenceQuerySpy: jest.SpyInstance;
    let preferenceSubscriptions: number;

    // Two preference queries feed manually closed DMs/GMs and two feed autoclose
    const SHARED_PREFERENCE_QUERIES = 4;

    const addCategories = async (count: number) => {
        const categories = Array.from({length: count}, (_, i) => ({
            ...TestHelper.fakeCategoryWithId(TestHelper.basicTeam!.id),
            sort_order: i + 1,
        }));
        await operator.handleCategories({categories, prepareRecordsOnly: false});
    };

    const subscribe = () => {
        const emissions: FlattenedCategoriesData[] = [];
        subscription = observeFlattenedCategories(
            database,
            TestHelper.basicUser!.id,
            'en',
            false,
            false,
            TestHelper.basicTeam!.id,
        ).subscribe((data) => emissions.push(data));
        return emissions;
    };

    const waitForHeaders = (emissions: FlattenedCategoriesData[], count: number) => {
        return waitFor(() => expect(emissions[emissions.length - 1]?.items.filter((i) => i.type === 'header')).toHaveLength(count));
    };

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        operator = server.operator;

        preferenceSubscriptions = 0;
        const original = PreferenceQueries.queryPreferencesByCategoryAndName;
        preferenceQuerySpy = jest.spyOn(PreferenceQueries, 'queryPreferencesByCategoryAndName').mockImplementation((...args) => {
            const query = original(...args);
            const observeWithColumns = query.observeWithColumns.bind(query);
            query.observeWithColumns = (columns) => defer(() => {
                preferenceSubscriptions++;
                return observeWithColumns(columns);
            });
            return query;
        });
    });

    afterEach(async () => {
        subscription?.unsubscribe();
        subscription = undefined;
        preferenceQuerySpy.mockRestore();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should query the shared preferences once regardless of the number of categories', async () => {
        await addCategories(3);

        const emissions = subscribe();
        await waitForHeaders(emissions, 4);

        expect(preferenceQuerySpy).toHaveBeenCalledTimes(SHARED_PREFERENCE_QUERIES);
        expect(preferenceSubscriptions).toBe(SHARED_PREFERENCE_QUERIES);
    });

    it('should not resubscribe to the shared preferences when the category list changes', async () => {
        const emissions = subscribe();
        await waitForHeaders(emissions, 1);
        expect(preferenceSubscriptions).toBe(SHARED_PREFERENCE_QUERIES);

        await addCategories(2);
        await waitForHeaders(emissions, 3);

        expect(preferenceSubscriptions).toBe(SHARED_PREFERENCE_QUERIES);
    });
});
