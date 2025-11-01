// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, combineLatest, type Observable} from 'rxjs';
import {switchMap, map, distinctUntilChanged} from 'rxjs/operators';

import {Preferences} from '@constants';
import {DMS_CATEGORY, UNREADS_CATEGORY} from '@constants/categories';
import {getSidebarPreferenceAsBool} from '@helpers/api/preference';
import {filterAndSortMyChannels, makeChannelsMap} from '@helpers/database';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {getChannelById, observeChannelsByLastPostAt, observeNotifyPropsByChannels, queryMyChannelUnreads} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName, querySidebarPreferences} from '@queries/servers/preference';
import {observeCurrentChannelId, observeLastUnreadChannelId} from '@queries/servers/system';
import {observeDeactivatedUsers} from '@queries/servers/user';
import {
    type ChannelWithMyChannel,
    filterArchivedChannels,
    filterAutoclosedDMs,
    filterManuallyClosedDms,
    getUnreadIds,
    sortChannels,
} from '@utils/categories';

import {flattenCategories, type CategoryData, type FlattenedItem} from './flatten_categories';

import type Database from '@nozbe/watermelondb/Database';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PreferenceModel from '@typings/database/models/servers/preference';

const filterUnreads = (channels: ChannelModel[], unreadIds: Set<string>) => {
    return channels.filter((c) => !unreadIds.has(c.id));
};

const observeCategoryChannels = (category: CategoryModel, myChannels: Observable<MyChannelModel[]>) => {
    const channels = category.channels.observeWithColumns(['create_at', 'display_name']);
    const manualSort = category.categoryChannelsBySortOrder.observeWithColumns(['sort_order']);
    return myChannels.pipe(
        switchMap((my) => combineLatest([of$(my), channels, manualSort])),
        map(([my, cs, sorted]) => {
            const channelMap = new Map<string, ChannelModel>(cs.map((c) => [c.id, c]));
            const categoryChannelMap = new Map<string, number>(sorted.map((s) => [s.channelId, s.sortOrder]));
            return my.reduce<ChannelWithMyChannel[]>((result, myChannel) => {
                const channel = channelMap.get(myChannel.id);
                if (channel) {
                    const channelWithMyChannel: ChannelWithMyChannel = {
                        channel,
                        myChannel,
                        sortOrder: categoryChannelMap.get(myChannel.id) || 0,
                    };
                    result.push(channelWithMyChannel);
                }
                return result;
            }, []);
        }),
    );
};

const observeCategoryData = (
    category: CategoryModel,
    database: Database,
    currentUserId: string,
    locale: string,
    isTablet: boolean,
): Observable<CategoryData> => {
    const categoryMyChannels = category.myChannels.observeWithColumns(['last_post_at', 'is_unread']);
    const channelsWithMyChannel = observeCategoryChannels(category, categoryMyChannels);
    const currentChannelId = isTablet ? observeCurrentChannelId(database) : of$('');
    const lastUnreadId = isTablet ? observeLastUnreadChannelId(database) : of$(undefined);

    let limit = of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
    if (category.type === DMS_CATEGORY) {
        limit = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
            observeWithColumns(['value']).pipe(
                switchMap((val) => {
                    return val[0] ? of$(parseInt(val[0].value, 10)) : of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
                }),
            );
    }

    const notifyPropsPerChannel = categoryMyChannels.pipe(
        switchMap((mc) => observeNotifyPropsByChannels(database, mc)),
    );

    const hiddenDmPrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW, undefined, 'false').
        observeWithColumns(['value']);
    const hiddenGmPrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.GROUP_CHANNEL_SHOW, undefined, 'false').
        observeWithColumns(['value']);
    const manuallyClosedPrefs = hiddenDmPrefs.pipe(
        switchMap((dms) => combineLatest([of$(dms), hiddenGmPrefs])),
        map(([dms, gms]) => dms.concat(gms)),
    );

    const approxViewTimePrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_APPROXIMATE_VIEW_TIME, undefined).
        observeWithColumns(['value']);
    const openTimePrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_OPEN_TIME, undefined).
        observeWithColumns(['value']);
    const autoclosePrefs = approxViewTimePrefs.pipe(
        switchMap((viewTimes) => combineLatest([of$(viewTimes), openTimePrefs])),
        map(([viewTimes, openTimes]) => viewTimes.concat(openTimes)),
    );

    // Observe category changes (especially collapsed state and sorting)
    const categoryObservable = category.observe().pipe(
        map((c) => ({sorting: c.sorting, collapsed: c.collapsed, type: c.type})),
        distinctUntilChanged((a, b) => a.sorting === b.sorting && a.collapsed === b.collapsed && a.type === b.type),
    );

    const deactivated = (category.type === DMS_CATEGORY) ? observeDeactivatedUsers(database) : of$(undefined);

    return combineLatest([
        channelsWithMyChannel,
        categoryObservable,
        currentChannelId,
        lastUnreadId,
        notifyPropsPerChannel,
        manuallyClosedPrefs,
        autoclosePrefs,
        deactivated,
        limit,
    ]).pipe(
        map(([cwms, catData, channelId, unreadId, notifyProps, manuallyClosedDms, autoclose, deactivatedUsers, maxDms]) => {
            let channelsW = cwms;
            channelsW = filterArchivedChannels(channelsW, channelId);
            channelsW = filterManuallyClosedDms(channelsW, notifyProps, manuallyClosedDms, currentUserId, unreadId);
            channelsW = filterAutoclosedDMs(catData.type, maxDms, currentUserId, channelId, channelsW, autoclose, notifyProps, deactivatedUsers, unreadId);

            const sortedChannels = sortChannels(catData.sorting, channelsW, notifyProps, locale);
            const unreadIds = getUnreadIds(cwms, notifyProps, unreadId);
            const allUnreadChannels = sortedChannels.filter((c) => unreadIds.has(c.id));

            return {
                category,
                sortedChannels,
                unreadIds,
                allUnreadChannels,
            };
        }),
    );
};

// Observable for onlyUnreads mode - flat list of unread channels sorted by lastPostAt
const observeFlattenedUnreads = (
    database: Database,
    currentTeamId: string,
    isTablet: boolean,
): Observable<FlattenedItem[]> => {
    const getC = (lastUnreadChannelId: string) => getChannelById(database, lastUnreadChannelId);

    const lastUnread = isTablet ? observeLastUnreadChannelId(database).pipe(
        switchMap(getC),
    ) : of$(undefined);

    const myUnreadChannels = queryMyChannelUnreads(database, currentTeamId).observeWithColumns(['last_post_at', 'is_unread']);
    const notifyProps = myUnreadChannels.pipe(switchMap((cs) => observeNotifyPropsByChannels(database, cs)));
    const channels = myUnreadChannels.pipe(switchMap((myChannels) => observeChannelsByLastPostAt(database, myChannels)));
    const channelsMap = channels.pipe(switchMap((cs) => of$(makeChannelsMap(cs))));

    return combineLatest([myUnreadChannels, channelsMap, notifyProps, lastUnread]).pipe(
        map(([myChannels, chMap, nProps, lastUnreadChannel]) => {
            const filtered = filterAndSortMyChannels([myChannels, chMap, nProps]);

            let sortedChannels = filtered;
            if (lastUnreadChannel && isTablet) {
                sortedChannels = filtered.filter((c) => c && c.id !== lastUnreadChannel.id);
                sortedChannels.unshift(lastUnreadChannel);
            }

            const items: FlattenedItem[] = sortedChannels.
                filter((c): c is ChannelModel => c !== null).
                map((channel) => ({
                    type: 'channel',
                    categoryId: UNREADS_CATEGORY,
                    channelId: channel.id,
                    channel,
                }));

            return items;
        }),
    );
};

// Observable for normal mode - categories with headers and grouped channels
const observeFlattenedCategoriesNormal = (
    categories: CategoryModel[],
    database: Database,
    currentUserId: string,
    locale: string,
    isTablet: boolean,
): Observable<FlattenedItem[]> => {
    if (categories.length === 0) {
        return of$([]);
    }

    const unreadsOnTop = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getSidebarPreferenceAsBool(prefs, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
        );

    const categoryDataObservables = categories.map((category) =>
        observeCategoryData(category, database, currentUserId, locale, isTablet),
    );

    return combineLatest([combineLatest(categoryDataObservables), unreadsOnTop]).pipe(
        map(([categoriesData, unreadsOnTopValue]) => {
            const processedCategoriesData: CategoryData[] = categoriesData.map((catData) => {
                if (unreadsOnTopValue) {
                    return {
                        ...catData,
                        sortedChannels: filterUnreads(catData.sortedChannels, catData.unreadIds),
                    };
                }
                return catData;
            });

            return flattenCategories(processedCategoriesData, unreadsOnTopValue);
        }),
        distinctUntilChanged((prev, curr) => {
            if (prev.length !== curr.length) {
                return false;
            }

            for (let i = 0; i < prev.length; i++) {
                const prevItem = prev[i];
                const currItem = curr[i];

                if (prevItem.type !== currItem.type) {
                    return false;
                }

                if (prevItem.type === 'unreads_header') {
                    continue;
                }

                if (prevItem.type === 'header' && currItem.type === 'header') {
                    if (prevItem.categoryId !== currItem.categoryId) {
                        return false;
                    }
                } else if (prevItem.type === 'channel' && currItem.type === 'channel') {
                    if (prevItem.channelId !== currItem.channelId) {
                        return false;
                    }
                }
            }

            return true;
        }),
    );
};

const sortCategories = (categories: CategoryModel[]) => {
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
};

// Routes to the appropriate observable based on onlyUnreads mode
export const observeFlattenedCategories = (
    database: Database,
    currentUserId: string,
    locale: string,
    isTablet: boolean,
    onlyUnreads: boolean,
    currentTeamId: string,
): Observable<FlattenedItem[]> => {
    if (onlyUnreads) {
        return observeFlattenedUnreads(database, currentTeamId, isTablet);
    }

    // Observe categories for the current team
    const categories = queryCategoriesByTeamIds(database, [currentTeamId]).observeWithColumns(['sort_order', 'collapsed']);

    return categories.pipe(
        switchMap((cats) => observeFlattenedCategoriesNormal(sortCategories(cats), database, currentUserId, locale, isTablet)),
    );
};
