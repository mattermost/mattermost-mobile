// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {CHANNELS_CATEGORY, DMS_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {prepareCategories, prepareCategoryChannels, queryCategoriesByTeamIds, getCategoryById} from '@queries/servers/categories';
import {getCurrentUserId} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {isDMorGM} from '@utils/channel';
import {pluckUnique} from '@utils/helpers';

import type ChannelModel from '@typings/database/models/servers/channel';

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

export async function storeCategories(serverUrl: string, categories: CategoryWithChannels[], prune = false, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const modelPromises: Array<Promise<Model[]>> = [];
    const preparedCategories = prepareCategories(operator, categories);
    if (preparedCategories) {
        modelPromises.push(preparedCategories);
    }

    const preparedCategoryChannels = prepareCategoryChannels(operator, categories);
    if (preparedCategoryChannels) {
        modelPromises.push(preparedCategoryChannels);
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat();

    if (prune && categories.length) {
        const {database} = operator;
        const remoteCategoryIds = new Set(categories.map((cat) => cat.id));

        // If the passed categories have more than one team, we want to update across teams
        const teamIds = pluckUnique('team_id')(categories) as string[];
        const localCategories = await queryCategoriesByTeamIds(database, teamIds).fetch();

        localCategories.
            filter((category) => category.type === 'custom').
            forEach((localCategory) => {
                if (!remoteCategoryIds.has(localCategory.id)) {
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
}

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

export async function addChannelToDefaultCategory(serverUrl: string, channel: Channel | ChannelModel, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;

    const teamId = 'teamId' in channel ? channel.teamId : channel.team_id;
    const userId = await getCurrentUserId(database);
    if (!userId) {
        return {error: 'no current user id'};
    }

    const models: Model[] = [];
    const categoriesWithChannels: CategoryWithChannels[] = [];

    if (isDMorGM(channel)) {
        const allTeamIds = await queryMyTeams(database).fetchIds();
        const categories = await queryCategoriesByTeamIds(database, allTeamIds).fetch();
        const channelCategories = categories.filter((c) => c.type === DMS_CATEGORY);
        for await (const cc of channelCategories) {
            const cwc = await cc.toCategoryWithChannels();
            cwc.channel_ids.unshift(channel.id);
            categoriesWithChannels.push(cwc);
        }
    } else {
        const categories = await queryCategoriesByTeamIds(database, [teamId]).fetch();
        const channelCategory = categories.find((c) => c.type === CHANNELS_CATEGORY);
        if (channelCategory) {
            const cwc = await channelCategory.toCategoryWithChannels();
            cwc.channel_ids.unshift(channel.id);
            categoriesWithChannels.push(cwc);
        }

        const ccModels = await prepareCategoryChannels(operator, categoriesWithChannels);
        models.push(...ccModels);
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
}
