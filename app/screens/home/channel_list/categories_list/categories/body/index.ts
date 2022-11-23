// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap, combineLatestWith} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {DMS_CATEGORY} from '@constants/categories';
import {MyChannelModel} from '@database/models/server';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observeChannelsByCategoryChannelSortOrder, observeChannelsByLastPostAtInCategory} from '@queries/servers/categories';
import {observeNotifyPropsByChannels, queryChannelsByNames, queryEmptyDirectAndGroupChannels} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentUserId, observeLastUnreadChannelId} from '@queries/servers/system';
import {getDirectChannelName} from '@utils/channel';

import CategoryBody from './category_body';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PreferenceModel from '@typings/database/models/servers/preference';

type ChannelData = Pick<ChannelModel, 'id' | 'displayName'> & {
    isMuted: boolean;
};

type EnhanceProps = {
    category: CategoryModel;
    locale: string;
    currentUserId: string;
    isTablet: boolean;
} & WithDatabaseArgs

const sortAlpha = (locale: string, a: ChannelData, b: ChannelData) => {
    if (a.isMuted && !b.isMuted) {
        return 1;
    } else if (!a.isMuted && b.isMuted) {
        return -1;
    }

    return a.displayName.localeCompare(b.displayName, locale, {numeric: true});
};

const filterArchived = (channels: Array<ChannelModel | null>, currentChannelId: string) => {
    return channels.filter((c): c is ChannelModel => c != null && ((c.deleteAt > 0 && c.id === currentChannelId) || !c.deleteAt));
};

const buildAlphaData = (channels: ChannelModel[], notifyProps: Record<string, Partial<ChannelNotifyProps>>, locale: string) => {
    const chanelsById = channels.reduce((result: Record<string, ChannelModel>, c) => {
        result[c.id] = c;
        return result;
    }, {});

    const combined = channels.map((c) => {
        const s = notifyProps[c.id];
        return {
            id: c.id,
            displayName: c.displayName,
            isMuted: s?.mark_unread === General.MENTION,
        };
    });

    combined.sort(sortAlpha.bind(null, locale));
    return of$(combined.map((cdata) => chanelsById[cdata.id]));
};

const observeSortedChannels = (database: Database, category: CategoryModel, excludeIds: string[], locale: string) => {
    switch (category.sorting) {
        case 'alpha': {
            const channels = category.channels.extend(Q.where('id', Q.notIn(excludeIds))).observeWithColumns(['display_name']);
            const notifyProps = channels.pipe(switchMap((cs) => observeNotifyPropsByChannels(database, cs)));
            return combineLatest([channels, notifyProps]).pipe(
                switchMap(([cs, np]) => buildAlphaData(cs, np, locale)),
            );
        }
        case 'manual': {
            return observeChannelsByCategoryChannelSortOrder(database, category, excludeIds);
        }
        default:
            return observeChannelsByLastPostAtInCategory(database, category, excludeIds);
    }
};

const mapPrefName = (prefs: PreferenceModel[]) => of$(prefs.map((p) => p.name));

const mapChannelIds = (channels: ChannelModel[] | MyChannelModel[]) => of$(channels.map((c) => c.id));

const withUserId = withObservables([], ({database}: WithDatabaseArgs) => ({currentUserId: observeCurrentUserId(database)}));

const enhance = withObservables(['category', 'isTablet', 'locale'], ({category, locale, isTablet, database, currentUserId}: EnhanceProps) => {
    const dmMap = (p: PreferenceModel) => getDirectChannelName(p.name, currentUserId);

    const currentChannelId = observeCurrentChannelId(database);

    const hiddenDmIds = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, undefined, 'false').
        observeWithColumns(['value']).pipe(
            switchMap((prefs: PreferenceModel[]) => {
                const names = prefs.map(dmMap);
                const channels = queryChannelsByNames(database, names).observe();

                return channels.pipe(
                    switchMap(mapChannelIds),
                );
            }),
        );

    const emptyDmIds = queryEmptyDirectAndGroupChannels(database).observeWithColumns(['last_post_at']).pipe(
        switchMap(mapChannelIds),
    );

    const hiddenChannelIds = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_GROUP_CHANNEL_SHOW, undefined, 'false').
        observeWithColumns(['value']).pipe(
            switchMap(mapPrefName),
            combineLatestWith(hiddenDmIds, emptyDmIds),
            switchMap(([hIds, hDmIds, eDmIds]) => {
                return of$(new Set(hIds.concat(hDmIds, eDmIds)));
            }),
        );

    const sortedChannels = hiddenChannelIds.pipe(
        switchMap((excludeIds) => observeSortedChannels(database, category, Array.from(excludeIds), locale)),
        combineLatestWith(currentChannelId),
        map(([channels, ccId]) => filterArchived(channels, ccId)),
    );

    let limit = of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
    if (category.type === DMS_CATEGORY) {
        limit = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
            observeWithColumns(['value']).pipe(
                switchMap((val) => {
                    return val[0] ? of$(parseInt(val[0].value, 10)) : of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
                }),
            );
    }

    const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
        );

    const lastUnreadId = isTablet ? observeLastUnreadChannelId(database) : of$(undefined);
    const unreadChannels = category.myChannels.observeWithColumns(['mentions_count', 'is_unread']);
    const notifyProps = unreadChannels.pipe(switchMap((myChannels) => observeNotifyPropsByChannels(database, myChannels)));
    const unreadIds = unreadChannels.pipe(
        combineLatestWith(notifyProps, lastUnreadId),
        map(([my, settings, lastUnread]) => {
            return my.reduce<Set<string>>((set, m) => {
                const isMuted = settings[m.id]?.mark_unread === 'mention';
                if ((isMuted && m.mentionsCount) || (!isMuted && m.isUnread) || m.id === lastUnread) {
                    set.add(m.id);
                }
                return set;
            }, new Set());
        }),
    );

    return {
        limit,
        sortedChannels,
        notifyProps,
        lastUnreadId,
        unreadsOnTop,
        unreadIds,
        category,
    };
});

export default withDatabase(withUserId(enhance(CategoryBody)));
