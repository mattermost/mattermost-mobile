// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CHANNELS_CATEGORY, DMS_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {prepareCategoryChannels, queryCategoriesByTeamIds, getCategoryById, prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {getCurrentUserId} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {isDMorGM} from '@utils/channel';
import {logError} from '@utils/log';

import type ChannelModel from '@typings/database/models/servers/channel';

export const deleteCategory = async (serverUrl: string, categoryId: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const category = await getCategoryById(database, categoryId);

        if (category) {
            await database.write(async () => {
                await category.destroyPermanently();
            });
        }

        return {category};
    } catch (error) {
        logError('FAILED TO DELETE CATEGORY', categoryId);
        return {error};
    }
};

export async function storeCategories(serverUrl: string, categories: CategoryWithChannels[], prune = false, prepareRecordsOnly = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await prepareCategoriesAndCategoriesChannels(operator, categories, prune);

        if (prepareRecordsOnly) {
            return {models};
        }

        if (models.length > 0) {
            await operator.batchRecords(models, 'storeCategories');
        }

        return {models};
    } catch (error) {
        logError('FAILED TO STORE CATEGORIES', error);
        return {error};
    }
}

export const toggleCollapseCategory = async (serverUrl: string, categoryId: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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
        logError('FAILED TO COLLAPSE CATEGORY', categoryId, error);
        return {error};
    }
};

export async function addChannelToDefaultCategory(serverUrl: string, channel: Channel | ChannelModel, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teamId = 'teamId' in channel ? channel.teamId : channel.team_id;
        const userId = await getCurrentUserId(database);

        if (!userId) {
            return {error: 'no current user id'};
        }

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
        }

        const models = await prepareCategoryChannels(operator, categoriesWithChannels);

        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models, 'addChannelToDefaultCategory');
        }

        return {models};
    } catch (error) {
        return {error};
    }
}
