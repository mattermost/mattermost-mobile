// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, combineLatest, type Observable} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';

import {UNREADS_CATEGORY} from '@constants/categories';
import {filterAndSortMyChannels, makeChannelsMap} from '@helpers/database';
import {queryCategoriesByTeamIds, queryCategoryChannelsByCategoryIds} from '@queries/servers/categories';
import {
    getChannelById,
    observeChannelsByLastPostAt,
    observeNotifyPropsByChannels,
    queryMyChannelUnreads,
} from '@queries/servers/channel';
import {observeLastUnreadChannelId} from '@queries/servers/system';

import {type CategoryMembership, type FlattenedItem} from './flatten_categories';

import type Database from '@nozbe/watermelondb/Database';
import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';

export type FlattenedCategoriesData = {
    items: FlattenedItem[];
    unreadChannelIds: Set<string>;
};

export const observeFlattenedUnreads = (
    database: Database,
    currentTeamId: string,
    isTablet: boolean,
): Observable<FlattenedCategoriesData> => {
    const lastUnread = isTablet ? observeLastUnreadChannelId(database).pipe(
        switchMap((id) => getChannelById(database, id)),
    ) : of$(undefined);

    const myUnreadChannels = queryMyChannelUnreads(database, currentTeamId).observeWithColumns(['last_post_at', 'is_unread']);
    const notifyProps = myUnreadChannels.pipe(switchMap((cs) => observeNotifyPropsByChannels(database, cs)));
    const channels = myUnreadChannels.pipe(switchMap((myChannels) => observeChannelsByLastPostAt(database, myChannels)));
    const channelsMap = channels.pipe(switchMap((cs) => of$(makeChannelsMap(cs))));

    return combineLatest([myUnreadChannels, channelsMap, notifyProps, lastUnread]).pipe(
        map(([myChannels, chMap, nProps, lastUnreadChannel]) => {
            const filteredChannels = filterAndSortMyChannels([myChannels, chMap, nProps]);

            let sortedChannels = filteredChannels;
            if (lastUnreadChannel && isTablet) {
                sortedChannels = filteredChannels.filter((c) => c && c.id !== lastUnreadChannel.id);
                sortedChannels.unshift(lastUnreadChannel);
            }

            const items: FlattenedItem[] = sortedChannels.
                filter((c): c is ChannelModel => c !== null).
                map((channel) => ({
                    type: 'channel',
                    categoryId: UNREADS_CATEGORY,
                    categoryType: UNREADS_CATEGORY,
                    channelId: channel.id,
                    channel,
                }));

            const unreadChannelIds = new Set<string>();
            for (const item of items) {
                if (item.type === 'channel') {
                    unreadChannelIds.add(item.channelId);
                }
            }

            return {items, unreadChannelIds};
        }),
    );
};

export const observeCategoryItems = (
    database: Database,
    currentTeamId: string,
): Observable<FlattenedCategoriesData> => {
    const categories = queryCategoriesByTeamIds(database, [currentTeamId]).
        observeWithColumns(['sort_order']).
        pipe(map((cats) => [...cats].sort((a, b) => a.sortOrder - b.sortOrder)));

    const buildResult = (cats: CategoryModel[], ccs: CategoryChannelModel[]): FlattenedCategoriesData => {
        const memberships = new Map<string, CategoryMembership>();
        for (const cat of cats) {
            memberships.set(cat.id, {channelIds: [], sortOrderMap: new Map()});
        }
        for (const cc of ccs) {
            const m = memberships.get(cc.categoryId);
            if (m) {
                m.channelIds.push(cc.channelId);
                m.sortOrderMap.set(cc.channelId, cc.sortOrder);
            }
        }
        const items: FlattenedItem[] = cats.map((cat) => ({
            type: 'category',
            category: cat,
            membership: memberships.get(cat.id) ?? {channelIds: [], sortOrderMap: new Map()},
        }));
        return {items, unreadChannelIds: new Set<string>()};
    };

    return categories.pipe(
        switchMap((cats) => {
            const ids = cats.map((c) => c.id);
            const channelQuery = ids.length === 0 ? of$<CategoryChannelModel[]>([]) : queryCategoryChannelsByCategoryIds(database, ids).observeWithColumns(['sort_order']);
            return channelQuery.pipe(map((ccs) => buildResult(cats, ccs)));
        }),
    );
};
