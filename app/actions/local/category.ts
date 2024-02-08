// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CHANNELS_CATEGORY, DMS_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {prepareCategoryChannels, queryCategoriesByTeamIds, getCategoryById, prepareCategoriesAndCategoriesChannels, queryCategoryChannelsByChannelId} from '@queries/servers/categories';
import {getCurrentUserId} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {isDMorGM} from '@utils/channel';
import {logDebug, logError} from '@utils/log';

import type {Database, Model} from '@nozbe/watermelondb';
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
            const cwc = await prepareAddNonGMDMChannelToDefaultCategory(database, teamId, channel.id);
            if (cwc) {
                categoriesWithChannels.push(cwc);
            }
        }

        const models = await prepareCategoryChannels(operator, categoriesWithChannels);

        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models, 'addChannelToDefaultCategory');
        }

        return {models};
    } catch (error) {
        logError('Failed to add channel to default category', error);
        return {error};
    }
}

async function prepareAddNonGMDMChannelToDefaultCategory(database: Database, teamId: string, channelId: string): Promise<CategoryWithChannels | undefined> {
    const categories = await queryCategoriesByTeamIds(database, [teamId]).fetch();
    const channelCategory = categories.find((category) => category.type === CHANNELS_CATEGORY);
    if (channelCategory) {
        const cwc = await channelCategory.toCategoryWithChannels();
        if (cwc.channel_ids.indexOf(channelId) < 0) {
            cwc.channel_ids.unshift(channelId);
            return cwc;
        }
    }

    return undefined;
}

export async function handleConvertedGMCategories(serverUrl: string, channelId: string, targetTeamID: string, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const categoryChannels = await queryCategoryChannelsByChannelId(database, channelId).fetch();

        const categories = await queryCategoriesByTeamIds(database, [targetTeamID]).fetch();
        const channelCategory = categories.find((category) => category.type === CHANNELS_CATEGORY);

        if (!channelCategory) {
            const error = 'Failed to find default category when handling category of converted GM';
            logError(error);
            return {error};
        }

        const models: Model[] = [];

        categoryChannels.forEach((categoryChannel) => {
            if (categoryChannel.categoryId !== channelCategory.id) {
                models.push(categoryChannel.prepareDestroyPermanently());
            }
        });

        const cwc = await prepareAddNonGMDMChannelToDefaultCategory(database, targetTeamID, channelId);
        if (cwc) {
            const model = await prepareCategoryChannels(operator, [cwc]);
            models.push(...model);
        } else {
            logDebug('handleConvertedGMCategories: could not find channel category of target team');
        }

        if (models.length > 0 && !prepareRecordsOnly) {
            await operator.batchRecords(models, 'putGMInCorrectCategory');
        }

        return {models};
    } catch (error) {
        logError('Failed to handle category update for GM converted to channel', error);
        return {error};
    }
}
