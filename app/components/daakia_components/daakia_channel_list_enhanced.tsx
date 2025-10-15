// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$, Observable} from 'rxjs';
import {switchMap, combineLatestWith, map} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {DMS_CATEGORY, FAVORITES_CATEGORY} from '@constants/categories';
import {getPreferenceValue} from '@helpers/api/preference';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {observeNotifyPropsByChannels} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName, querySidebarPreferences} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeCurrentChannelId, observeCurrentUserId, observeLastUnreadChannelId} from '@queries/servers/system';
import {observeDeactivatedUsers} from '@queries/servers/user';
import {type ChannelWithMyChannel, filterArchivedChannels, filterAutoclosedDMs, filterManuallyClosedDms, getUnreadIds, sortChannels} from '@utils/categories';

import DaakiaChannelList from './daakia_channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';

type EnhanceProps = {
    currentTeamId?: string;
    locale: string;
    currentUserId: string;
    isTablet: boolean;
    filterType: string;
} & WithDatabaseArgs

const withUserId = withObservables([], ({database}: WithDatabaseArgs) => ({currentUserId: observeCurrentUserId(database)}));

const observeCategoryChannels = (category: CategoryModel, myChannels: Observable<MyChannelModel[]>) => {
    const channels = category.channels.observeWithColumns(['create_at', 'display_name']);
    const manualSort = category.categoryChannelsBySortOrder.observeWithColumns(['sort_order']);
    return myChannels.pipe(
        combineLatestWith(channels, manualSort),
        switchMap(([my, cs, sorted]) => {
            const channelMap = new Map<string, ChannelModel>(cs.map((c) => [c.id, c]));
            const categoryChannelMap = new Map<string, number>(sorted.map((s) => [s.channelId, s.sortOrder]));
            return of$(my.reduce<ChannelWithMyChannel[]>((result, myChannel) => {
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
            }, []));
        }),
    );
};

const enhanced = withObservables(['currentTeamId', 'filterType'], ({currentTeamId, currentUserId, database, isTablet, locale, filterType}: EnhanceProps) => {
    if (!currentTeamId) {
        return {
            allChannels: of$([]),
            unreadIds: of$(new Set()),
            unreadsOnTop: of$(false),
        };
    }

    const categories = queryCategoriesByTeamIds(database, [currentTeamId]).
        observeWithColumns(['sort_order', 'type']);

    const unreadsOnTopUserPreference = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getPreferenceValue<string>(prefs, Preferences.CATEGORIES.SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
        );

    const unreadsOnTopServerPreference = observeConfigBooleanValue(database, 'ExperimentalGroupUnreadChannels');

    const unreadsOnTop = unreadsOnTopServerPreference.pipe(
        combineLatestWith(unreadsOnTopUserPreference),
        switchMap(([s, u]) => {
            if (!u) {
                return of$(s);
            }
            return of$(u !== 'false');
        }),
    );

    // Helper to map category to observable
    const mapCategoryToObservable = (category: CategoryModel) => {
        const categoryMyChannels = category.myChannels.observeWithColumns(['last_post_at', 'is_unread']);
        return observeCategoryChannels(category, categoryMyChannels);
    };

    // Helper to deduplicate channels by ID
    const deduplicateChannels = (channels: ChannelWithMyChannel[]) => {
        const uniqueChannelsMap = new Map<string, ChannelWithMyChannel>();
        channels.forEach((cwm) => {
            if (!uniqueChannelsMap.has(cwm.channel.id)) {
                uniqueChannelsMap.set(cwm.channel.id, cwm);
            }
        });
        return Array.from(uniqueChannelsMap.values());
    };

    // Helper to apply favorites filter
    const applyFavoritesFilter = (channels: ChannelWithMyChannel[], cats: CategoryModel[], results: unknown[]) => {
        const favoritesCategory = cats.find((c) => c.type === FAVORITES_CATEGORY);

        if (!favoritesCategory) {
            return [];
        }
        const favIndex = cats.indexOf(favoritesCategory);
        const favoriteChannels = results[favIndex] as ChannelWithMyChannel[];
        const favoriteIds = new Set(favoriteChannels.map((cwm) => cwm.channel.id));

        return channels.filter((cwm) => favoriteIds.has(cwm.channel.id));
    };

    // Flatten all channels from all categories
    const allChannelsWithMyChannel = categories.pipe(
        switchMap((cats) => {
            if (!cats.length) {
                return of$([]);
            }

            const categoryObservables = cats.map(mapCategoryToObservable);

            return combineLatest(categoryObservables).pipe(
                switchMap((results) => {
                    let channels = deduplicateChannels(results.flat() as ChannelWithMyChannel[]);

                    // Apply favorites filter if needed
                    if (filterType === 'favorites') {
                        channels = applyFavoritesFilter(channels, cats, results);
                    }

                    return of$(channels);
                }),
            );
        }),
    );

    const currentChannelId = isTablet ? observeCurrentChannelId(database) : of$('');
    const lastUnreadId = isTablet ? observeLastUnreadChannelId(database) : of$(undefined);

    // Apply same filtering logic as original
    const allChannels = allChannelsWithMyChannel.pipe(
        combineLatestWith(currentChannelId, lastUnreadId),
        switchMap(([channelsWithMyChannel, channelId, unreadId]) => {
            let filtered = channelsWithMyChannel as ChannelWithMyChannel[];

            // Apply all the same filters
            filtered = filterArchivedChannels(filtered, channelId);

            // Get proper filtering preferences
            const myChannels = filtered.map((c) => c.myChannel);
            const notifyPropsPerChannel = observeNotifyPropsByChannels(database, myChannels);

            const hiddenDmPrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW, undefined, 'false').
                observeWithColumns(['value']);
            const hiddenGmPrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.GROUP_CHANNEL_SHOW, undefined, 'false').
                observeWithColumns(['value']);
            const manuallyClosedPrefs = hiddenDmPrefs.pipe(
                combineLatestWith(hiddenGmPrefs),
                switchMap(([dms, gms]) => of$(dms.concat(gms))),
            );

            const approxViewTimePrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_APPROXIMATE_VIEW_TIME, undefined).
                observeWithColumns(['value']);
            const openTimePrefs = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.CHANNEL_OPEN_TIME, undefined).
                observeWithColumns(['value']);
            const autoclosePrefs = approxViewTimePrefs.pipe(
                combineLatestWith(openTimePrefs),
                switchMap(([viewTimes, openTimes]) => of$(viewTimes.concat(openTimes))),
            );

            const deactivatedUsers = observeDeactivatedUsers(database);

            const limit = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
                observeWithColumns(['value']).pipe(
                    switchMap((val) => {
                        return val[0] ? of$(parseInt(val[0].value, 10)) : of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
                    }),
                );

            return combineLatestWith(notifyPropsPerChannel, manuallyClosedPrefs, autoclosePrefs, deactivatedUsers, limit)(of$(filtered)).pipe(
                switchMap(([cwms, notifyProps, manuallyClosedDms, autoclose, deactivated, maxDms]) => {
                    let channelsW = cwms as ChannelWithMyChannel[];

                    channelsW = filterManuallyClosedDms(channelsW, notifyProps, manuallyClosedDms, currentUserId, unreadId);
                    channelsW = filterAutoclosedDMs(DMS_CATEGORY, maxDms, currentUserId, channelId, channelsW, autoclose, notifyProps, deactivated, unreadId);

                    // Apply tab filter
                    const isDM = (type: string) => type === General.DM_CHANNEL || type === General.GM_CHANNEL;
                    const isChannel = (type: string) => type === General.OPEN_CHANNEL || type === General.PRIVATE_CHANNEL;
                    const isUnread = (myChannel: MyChannelModel) => myChannel.isUnread || myChannel.mentionsCount > 0;

                    if (filterType === 'dms') {
                        channelsW = channelsW.filter((cwm) => isDM(cwm.channel.type));
                    } else if (filterType === 'channels') {
                        channelsW = channelsW.filter((cwm) => isChannel(cwm.channel.type));
                    } else if (filterType === 'unread') {
                        channelsW = channelsW.filter((cwm) => isUnread(cwm.myChannel));
                    }

                    // Note: 'favorites' and 'all' filters are handled in allChannelsWithMyChannel
                    return of$(sortChannels('recent', channelsW, notifyProps, locale));
                }),
            );
        }),
    );

    const unreadIds = allChannelsWithMyChannel.pipe(
        combineLatestWith(lastUnreadId),
        switchMap(([cwms, unreadId]) => {
            const myChannels = (cwms as ChannelWithMyChannel[]).map((c) => c.myChannel);
            return observeNotifyPropsByChannels(database, myChannels).pipe(
                switchMap((notifyProps) => {
                    return of$(getUnreadIds(cwms as ChannelWithMyChannel[], notifyProps, unreadId));
                }),
            );
        }),
    );

    const lastPosts = allChannelsWithMyChannel.pipe(
        switchMap((channelsWithMyChannel) => {
            const channels = (channelsWithMyChannel as ChannelWithMyChannel[]).filter((cwm) => cwm.myChannel.lastPostAt > 0);
            if (!channels.length) {
                return of$(new Map<string, PostModel>());
            }

            const ids = channels.map((c) => c.channel.id);
            const perChannelLatestPost$ = ids.map((id) =>
                database.get<PostModel>('Post').query(
                    Q.where('channel_id', id),
                    Q.sortBy('create_at', Q.desc),
                    Q.take(1),
                ).observe(),
            );

            return combineLatest(perChannelLatestPost$).pipe(
                map((results) => {
                    const latestByChannel = new Map<string, PostModel>();
                    for (let i = 0; i < results.length; i++) {
                        const arr = results[i];
                        const p = arr[0];
                        if (p) {
                            latestByChannel.set(ids[i], p);
                        }
                    }
                    return latestByChannel;
                }),
            );
        }),
    );

    return {
        allChannels,
        unreadIds,
        unreadsOnTop,
        lastPosts,
        currentTeamId: of$(currentTeamId || ''),
    };
});

export default withDatabase(withUserId(enhanced(DaakiaChannelList)));
