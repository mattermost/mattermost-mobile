// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MANAGED_LOCAL_CATEGORY_PREFIX} from '@constants/categories';
import {getCategoryById} from '@queries/servers/categories';

import type {Database} from '@nozbe/watermelondb';

export function makeManagedCategoryId(teamId: string, displayName: string): string {
    return `${MANAGED_LOCAL_CATEGORY_PREFIX}${teamId}:${displayName}`;
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

    const stripped = serverCategories.map((cat) => ({
        ...cat,
        channel_ids: cat.channel_ids.filter((id) => !managedChannelIds.has(id)),
    }));

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
    const managedCategories = await Promise.all(names.map(async (name, i) => {
        const channelIds = [...(byName.get(name) ?? [])].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
        const id = makeManagedCategoryId(teamId, name);
        const existing = await getCategoryById(database, id);
        return {
            id,
            team_id: teamId,
            display_name: name,
            sort_order: (-1000 + i) * 10,
            sorting: 'alpha' as CategorySorting,
            type: 'custom' as CategoryType,
            muted: false,
            collapsed: existing?.collapsed ?? false,
            channel_ids: channelIds,
        };
    }));

    return [...managedCategories, ...stripped];
}
