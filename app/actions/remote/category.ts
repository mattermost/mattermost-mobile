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

import type CategoryModel from '@typings/database/models/servers/category';
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

        // updateChannelCategories is a PUT that REPLACES a category's membership with exactly
        // the channel_ids we send, so the payload must be built from authoritative state.
        // toCategoryWithChannels() reads local CategoryChannel rows, and those can legitimately
        // be an incomplete view of the server: a partial initial sync, a team the user has not
        // fully loaded, or a missed WebSocket frame all leave rows absent. Sending that
        // truncated list re-files the user's other channels ON THE SERVER.
        //
        // Verified against a live server: the default Channels category is self-healing --
        // omit ids and the server puts still-joined channels back -- so that case is benign.
        // A custom category is not. Sending a truncated custom category ejects the missing
        // channels into Channels and leaves the category empty, and nothing puts them back:
        //   before: "My Project" [chan-a, chan-b]   (favorite chan-a, local knew only chan-a)
        //   after:  "My Project" []  /  Channels gains chan-b
        // The user's own grouping is what gets destroyed, and only a manual redo restores it.
        //
        // Fetch-only (no prune, no write) so this stays a read of server truth and does not
        // race the store below.
        const {categories: remoteCategories, error: fetchError} = await fetchCategories(serverUrl, teamId, false, true);
        if (fetchError || !remoteCategories) {
            // Deliberately fail closed. Falling back to the local list here would reintroduce
            // the exact truncation this guards against, and a failed favourite toggle is
            // recoverable where silently unfiling the user's channels is not.
            logDebug('toggleFavoriteChannel: no authoritative categories, skipping update', serverUrl, teamId);
            return {error: fetchError ?? 'failed to fetch categories'};
        }
        const remoteById = new Map(remoteCategories.map((c) => [c.id, c]));

        // isFavorited is derived from the LOCAL category while the id lists now come from the
        // server, so the two can legitimately disagree -- that divergence is the whole reason
        // this function reads remote state. Index arithmetic is not safe across it:
        // indexOf() returns -1 when the server disagrees and splice(-1, 1) removes the LAST
        // channel, silently unfiling an unrelated one. Work by identity instead, which is also
        // idempotent if the server already reflects the toggle.
        const withChannelFirst = (ids: string[]) => [channelId, ...ids.filter((id) => id !== channelId)];
        const withoutChannel = (ids: string[]) => ids.filter((id) => id !== channelId);
        const copyRemote = (remote: CategoryWithChannels): CategoryWithChannels => ({
            ...remote,
            channel_ids: [...remote.channel_ids],
        });
        const toWithChannels = (category: CategoryModel): CategoryWithChannels | undefined => {
            const remote = remoteById.get(category.id);
            if (!remote) {
                return undefined;
            }
            return copyRemote(remote);
        };

        // Local currentCategory can lag the server (WebSocket miss, another client).
        // PUT the remote category that actually holds the channel when that differs.
        const remoteCategoryContainingChannel = remoteCategories.find((c) => c.channel_ids.includes(channelId));
        const sourceCategoryForRemoval = (destinationId: string): CategoryWithChannels | undefined => {
            if (remoteCategoryContainingChannel && remoteCategoryContainingChannel.id !== destinationId) {
                return copyRemote(remoteCategoryContainingChannel);
            }
            return toWithChannels(currentCategory);
        };

        if (isFavorited) {
            const categoryType = (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) ? DMS_CATEGORY : CHANNELS_CATEGORY;
            const targetCategory = categories.find((c) => c.type === categoryType);
            if (!targetCategory) {
                return {error: 'target category not found'};
            }
            const remoteTarget = toWithChannels(targetCategory);
            const remoteFavorite = sourceCategoryForRemoval(remoteTarget?.id ?? '');
            if (!remoteTarget || !remoteFavorite) {
                return {error: 'remote category membership unavailable'};
            }
            targetWithChannels = {...remoteTarget, channel_ids: withChannelFirst(remoteTarget.channel_ids)};
            favoriteWithChannels = {...remoteFavorite, channel_ids: withoutChannel(remoteFavorite.channel_ids)};
        } else {
            const favoritesCategory = categories.find((c) => c.type === FAVORITES_CATEGORY);
            if (!favoritesCategory) {
                return {error: 'No favorites category'};
            }
            const remoteFavorite = toWithChannels(favoritesCategory);
            const remoteTarget = sourceCategoryForRemoval(remoteFavorite?.id ?? '');
            if (!remoteFavorite || !remoteTarget) {
                return {error: 'remote category membership unavailable'};
            }
            favoriteWithChannels = {...remoteFavorite, channel_ids: withChannelFirst(remoteFavorite.channel_ids)};
            targetWithChannels = {...remoteTarget, channel_ids: withoutChannel(remoteTarget.channel_ids)};
        }

        await client.updateChannelCategories('me', teamId, [targetWithChannels, favoriteWithChannels]);
        fetchCategories(serverUrl, teamId, true);

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
