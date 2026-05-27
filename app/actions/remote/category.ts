// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {General} from '@constants';
import {CHANNELS_CATEGORY, DMS_CATEGORY, FAVORITES_CATEGORY, MANAGED_CHANNEL_CATEGORIES_GROUP, MANAGED_LOCAL_CATEGORY_PREFIX} from '@constants/categories';
import DatabaseManager from '@database/manager';
import {computeManagedSortOrder, fetchManagedCategoryPropertyIds, makeManagedCategoryId, mergeManagedMappingsIntoSidebarCategories} from '@helpers/sidebar/managed_categories_merge';
import NetworkManager from '@managers/network_manager';
import {getCategoryById, getChannelCategory, queryCategoriesByTeamIds} from '@queries/servers/categories';
import {getChannelById} from '@queries/servers/channel';
import {getConfigValue, getCurrentTeamId} from '@queries/servers/system';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {showFavoriteChannelSnackbar} from '@utils/snack_bar';

import {forceLogoutIfNecessary} from './session';

import type ChannelModel from '@typings/database/models/servers/channel';

export type CategoriesRequest = {
     categories?: CategoryWithChannels[];
     error?: unknown;
 }

export const fetchCategories = async (serverUrl: string, teamId: string, prune = false, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<CategoriesRequest> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const managedCategoriesEnabled = await getConfigValue(database, 'EnableManagedChannelCategories');

        const {categories: nonManagedCategories} = await client.getCategories('me', teamId, groupLabel);
        let categories = nonManagedCategories;
        if (managedCategoriesEnabled === 'true') {
            fetchManagedCategoryPropertyIds(serverUrl);
            const mappings = await client.getManagedCategories(teamId, groupLabel);
            categories = await mergeManagedMappingsIntoSidebarCategories(database, teamId, nonManagedCategories, mappings);
        }

        if (!fetchOnly) {
            storeCategories(serverUrl, categories, prune);
        }

        return {categories};
    } catch (error) {
        logDebug('error on fetchCategories', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export async function addChannelToManagedCategoryIfNeeded(serverUrl: string, channel: Channel | ChannelModel) {
    const teamId = 'teamId' in channel ? channel.teamId : channel.team_id;
    if (!teamId || isDMorGM(channel)) {
        return;
    }
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const managedEnabled = await getConfigValue(database, 'EnableManagedChannelCategories');
        if (managedEnabled !== 'true') {
            return;
        }
        const channelId = channel.id;
        const client = NetworkManager.getClient(serverUrl);
        const values = await client.getPropertyValues<string>(
            MANAGED_CHANNEL_CATEGORIES_GROUP,
            'channel',
            channelId,
        );
        const categoryValue = values[0];
        if (!categoryValue?.value || String(categoryValue.value).length === 0) {
            return;
        }

        const categoryName = String(categoryValue.value);
        const managedCategoryId = makeManagedCategoryId(teamId, categoryName);
        const existingCategory = await getCategoryById(database, managedCategoryId);

        const categoriesToStore: CategoryWithChannels[] = [];
        let channelIds: string[];

        if (existingCategory) {
            const cwc = await existingCategory.toCategoryWithChannels();
            channelIds = cwc.channel_ids.includes(channelId) ? cwc.channel_ids : [...cwc.channel_ids, channelId];
        } else {
            channelIds = [channelId];
        }

        const allCategories = await queryCategoriesByTeamIds(database, [teamId]).fetch();
        const managedCategories = allCategories.filter((c) => c.id.startsWith(MANAGED_LOCAL_CATEGORY_PREFIX));
        const managedNames = managedCategories.map((c) => c.displayName);
        if (!existingCategory) {
            managedNames.push(categoryName);
        }
        managedNames.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
        const sortedNames = [...new Set(managedNames)];
        const sortOrder = computeManagedSortOrder(sortedNames.indexOf(categoryName));

        const reorderPromises = managedCategories.map(async (cat) => {
            const idx = sortedNames.indexOf(cat.displayName);
            if (idx >= 0) {
                const newOrder = computeManagedSortOrder(idx);
                if (cat.sortOrder !== newOrder) {
                    const cwc = await cat.toCategoryWithChannels();
                    return {...cwc, sort_order: newOrder};
                }
            }
            return undefined;
        });
        const reordered = (await Promise.all(reorderPromises)).filter(
            (c): c is CategoryWithChannels => c !== undefined,
        );
        categoriesToStore.push(...reordered);

        const managedCwc: CategoryWithChannels = {
            id: managedCategoryId,
            team_id: teamId,
            display_name: categoryName,
            sort_order: sortOrder,
            sorting: 'alpha',
            type: 'custom',
            muted: false,
            collapsed: existingCategory?.collapsed ?? false,
            channel_ids: channelIds,
        };
        categoriesToStore.push(managedCwc);

        await storeCategories(serverUrl, categoriesToStore);
    } catch (error) {
        logDebug('[addChannelToManagedCategoryIfNeeded]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
    }
}

export const toggleFavoriteChannel = async (serverUrl: string, channelId: string, showSnackBar = false) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channel = await getChannelById(database, channelId);
        if (!channel) {
            return {error: 'channel not found'};
        }

        const currentTeamId = await getCurrentTeamId(database);
        const teamId = channel?.teamId || currentTeamId;
        const currentCategory = await getChannelCategory(database, teamId, channelId);

        if (!currentCategory) {
            return {error: 'channel does not belong to a category'};
        }

        const categories = await queryCategoriesByTeamIds(database, [teamId]).fetch();
        const isFavorited = currentCategory.type === FAVORITES_CATEGORY;
        let targetWithChannels: CategoryWithChannels;
        let favoriteWithChannels: CategoryWithChannels;

        if (isFavorited) {
            const categoryType = (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) ? DMS_CATEGORY : CHANNELS_CATEGORY;
            const targetCategory = categories.find((c) => c.type === categoryType);
            if (!targetCategory) {
                return {error: 'target category not found'};
            }
            targetWithChannels = await targetCategory.toCategoryWithChannels();
            targetWithChannels.channel_ids.unshift(channelId);

            favoriteWithChannels = await currentCategory.toCategoryWithChannels();
            const channelIndex = favoriteWithChannels.channel_ids.indexOf(channelId);
            favoriteWithChannels.channel_ids.splice(channelIndex, 1);
        } else {
            const favoritesCategory = categories.find((c) => c.type === FAVORITES_CATEGORY);
            if (!favoritesCategory) {
                return {error: 'No favorites category'};
            }
            favoriteWithChannels = await favoritesCategory.toCategoryWithChannels();
            favoriteWithChannels.channel_ids.unshift(channelId);

            targetWithChannels = await currentCategory.toCategoryWithChannels();
            const channelIndex = targetWithChannels.channel_ids.indexOf(channelId);
            targetWithChannels.channel_ids.splice(channelIndex, 1);
        }

        await client.updateChannelCategories('me', teamId, [targetWithChannels, favoriteWithChannels]);

        if (showSnackBar) {
            const onUndo = () => toggleFavoriteChannel(serverUrl, channelId, false);
            showFavoriteChannelSnackbar(!isFavorited, onUndo);
        }

        return {data: true};
    } catch (error) {
        logDebug('error on toggleFavoriteChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
