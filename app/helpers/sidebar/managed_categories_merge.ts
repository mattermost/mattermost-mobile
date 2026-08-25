// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MANAGED_CHANNEL_CATEGORIES_FIELD, MANAGED_CHANNEL_CATEGORIES_GROUP, MANAGED_LOCAL_CATEGORY_PREFIX} from '@constants/categories';
import NetworkManager from '@managers/network_manager';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import EphemeralStore from '@store/ephemeral_store';
import {logDebug} from '@utils/log';

import type {Database} from '@nozbe/watermelondb';

export function makeManagedCategoryId(teamId: string, displayName: string): string {
    return `${MANAGED_LOCAL_CATEGORY_PREFIX}${teamId}:${displayName}`;
}

export function computeManagedSortOrder(index: number): number {
    return (-1000 + index) * 10;
}

export async function mergeManagedMappingsIntoSidebarCategories(
    database: Database,
    teamId: string,
    serverCategories: CategoryWithChannels[],
    mappings: Record<string, string>,
): Promise<CategoryWithChannels[]> {
    const managedChannelIds = new Set(Object.keys(mappings));
    if (managedChannelIds.size === 0) {
        return serverCategories;
    }

    const byName = new Map<string, string[]>();
    for (const [chId, name] of Object.entries(mappings)) {
        if (!name) {
            continue;
        }
        const list = byName.get(name) ?? [];
        list.push(chId);
        byName.set(name, list);
    }

    const names = [...byName.keys()].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

    const allLocalCategories = await queryCategoriesByTeamIds(database, [teamId]).fetch();
    const collapsedById = new Map<string, boolean>();
    for (const cat of allLocalCategories) {
        collapsedById.set(cat.id, cat.collapsed);
    }

    const managedCategories = names.map((name, i) => {
        const channelIds = [...(byName.get(name) ?? [])].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
        const id = makeManagedCategoryId(teamId, name);
        return {
            id,
            team_id: teamId,
            display_name: name,
            sort_order: computeManagedSortOrder(i),
            sorting: 'alpha' as CategorySorting,
            type: 'custom' as CategoryType,
            muted: false,
            collapsed: collapsedById.get(id) ?? false,
            channel_ids: channelIds,
        };
    });

    return [...managedCategories, ...serverCategories];
}

export async function fetchManagedCategoryPropertyIds(serverUrl: string) {
    const cached = EphemeralStore.getManagedCategoryPropertyIds(serverUrl);
    if (cached) {
        return cached;
    }

    try {
        const client = NetworkManager.getClient(serverUrl);
        const fields = await client.getPropertyFields(MANAGED_CHANNEL_CATEGORIES_GROUP, 'channel', 'system');
        if (fields.length === 0) {
            return undefined;
        }

        const field = fields.find((f) => f.name === MANAGED_CHANNEL_CATEGORIES_FIELD);
        if (!field) {
            return undefined;
        }

        const managedCategoryPropertyIds = {groupId: field.group_id, fieldId: field.id};
        EphemeralStore.setManagedCategoryPropertyIds(serverUrl, managedCategoryPropertyIds);
        return managedCategoryPropertyIds;
    } catch (error) {
        logDebug('[fetchManagedCategoryPropertyIds]', error);
        return undefined;
    }
}
