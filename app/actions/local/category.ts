// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {prepareCategories, prepareCategoryChannels, queryCategoriesByTeamIds, getCategoryById} from '@queries/servers/categories';
import {pluckUnique} from '@utils/helpers';

export const deleteCategory = async (serverUrl: string, categoryId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const category = await getCategoryById(database, categoryId);

        if (category) {
            await database.write(async () => {
                await category.destroyPermanently();
            });
        }

        return {category};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('FAILED TO DELETE CATEGORY', categoryId);
        return {error};
    }
};

export const storeCategories = async (serverUrl: string, categories: CategoryWithChannels[], prune = false, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
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

    if (prune && categories.length) {
        const {database} = operator;
        const remoteCategoryIds = categories.map((cat) => cat.id);

        // If the passed categories have more than one team, we want to update across teams
        const teamIds = pluckUnique('team_id')(categories) as string[];
        const localCategories = await queryCategoriesByTeamIds(database, teamIds).fetch();

        localCategories.
            filter((category) => category.type === 'custom').
            forEach((localCategory) => {
                if (!remoteCategoryIds.includes(localCategory.id)) {
                    localCategory.prepareDestroyPermanently();
                    flattenedModels.push(localCategory);
                }
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

export const toggleCollapseCategory = async (serverUrl: string, categoryId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const category = await getCategoryById(database, categoryId);

        if (category) {
            await database.write(async () => {
                await category.update(() => {
                    category.collapsed = !category.collapsed;
                });
            });
        }

        return {category};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('FAILED TO COLLAPSE CATEGORY', categoryId, error);
        return {error};
    }
};
