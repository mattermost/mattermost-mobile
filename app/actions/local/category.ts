// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {prepareCategories, prepareCategoryChannels, queryCategoriesByTeamId, queryCategoryById} from '@queries/servers/categories';

export const deleteCategory = async (serverUrl: string, categoryId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const category = await queryCategoryById(database, categoryId);
        database.write(async () => {
            await category?.destroyPermanently();
        });

        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('FAILED TO DELETE CATEGORY', categoryId);
        return {error};
    }
};

export const storeCategories = async (serverUrl: string, categories: CategoryWithChannels[], prepareRecordsOnly = false, prune = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!operator || !database) {
        return {error: `${serverUrl} database not found`};
    }
    const modelPromises: Array<Promise<Model[]>> = [];
    const preparedCategories = prepareCategories(operator, categories);
    if (preparedCategories) {
        modelPromises.push(...preparedCategories);
    }

    const preparedCategoryChannels = prepareCategoryChannels(operator, categories);
    if (preparedCategoryChannels) {
        modelPromises.push(...preparedCategoryChannels);
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat() as Model[];

    if (prune) {
        const remoteCategoryIds = categories.map((cat) => cat.id);
        const localCategories = await queryCategoriesByTeamId(database, categories[0].team_id);

        (localCategories).filter((cat) => {
            return !remoteCategoryIds.includes(cat.id);
        }).forEach((category) => {
            category.prepareDestroyPermanently();
            flattenedModels.push(category);
        });
    }

    if (prepareRecordsOnly) {
        return {models: flattenedModels};
    }

    if (flattenedModels?.length > 0) {
        try {
            await operator.batchRecords(flattenedModels);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('FAILED TO BATCH CATEGORIES', error);
            return {error};
        }
    }

    return {models: flattenedModels};
};
