// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap, concatAll, combineLatestWith} from 'rxjs/operators';

import {General, Preferences} from '@constants';
import {DMS_CATEGORY} from '@constants/categories';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {observeAllMyChannelNotifyProps, queryChannelsByNames, queryMyChannelSettingsByIds} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentUserId, observeLastUnreadChannelId} from '@queries/servers/system';
import {WithDatabaseArgs} from '@typings/database/database';
import {getDirectChannelName} from '@utils/channel';

import CategoryBody from './category_body';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type PreferenceModel from '@typings/database/models/servers/preference';

type ChannelData = Pick<ChannelModel, 'id' | 'displayName'> & {
    isMuted: boolean;
};

const sortAlpha = (locale: string, a: ChannelData, b: ChannelData) => {
    if (a.isMuted && !b.isMuted) {
        return 1;
    } else if (!a.isMuted && b.isMuted) {
        return -1;
    }

    return a.displayName.localeCompare(b.displayName, locale, {numeric: true});
};

const buildAlphaData = (channels: ChannelModel[], settings: MyChannelSettingsModel[], locale: string) => {
    const settingsById = settings.reduce((result: Record<string, MyChannelSettingsModel>, s) => {
        result[s.id] = s;
        return result;
    }, {});

    const chanelsById = channels.reduce((result: Record<string, ChannelModel>, c) => {
        result[c.id] = c;
        return result;
    }, {});

    const combined = channels.map((c) => {
        const s = settingsById[c.id];
        return {
            id: c.id,
            displayName: c.displayName,
            isMuted: s?.notifyProps?.mark_unread === General.MENTION,
        };
    });

    combined.sort(sortAlpha.bind(null, locale));
    return of$(combined.map((cdata) => chanelsById[cdata.id]));
};

const observeSettings = (database: Database, channels: ChannelModel[]) => {
    const ids = channels.map((c) => c.id);
    return queryMyChannelSettingsByIds(database, ids).observeWithColumns(['notify_props']);
};

export const getChannelsFromRelation = async (relations: CategoryChannelModel[] | MyChannelModel[]) => {
    return Promise.all(relations.map((r) => r.channel?.fetch()));
};

const getSortedChannels = (database: Database, category: CategoryModel, locale: string) => {
    switch (category.sorting) {
        case 'alpha': {
            const channels = category.channels.observeWithColumns(['display_name']);
            const settings = channels.pipe(
                switchMap((cs) => observeSettings(database, cs)),
            );
            return combineLatest([channels, settings]).pipe(
                switchMap(([cs, st]) => buildAlphaData(cs, st, locale)),
            );
        }
        case 'manual': {
            return category.categoryChannelsBySortOrder.observeWithColumns(['sort_order']).pipe(
                map(getChannelsFromRelation),
                concatAll(),
            );
        }
        default:
            return category.myChannels.observeWithColumns(['last_post_at']).pipe(
                map(getChannelsFromRelation),
                concatAll(),
            );
    }
};

const mapPrefName = (prefs: PreferenceModel[]) => of$(prefs.map((p) => p.name));

const mapChannelIds = (channels: ChannelModel[]) => of$(channels.map((c) => c.id));

type EnhanceProps = {
    category: CategoryModel;
    locale: string;
    currentUserId: string;
    isTablet: boolean;
} & WithDatabaseArgs

const withUserId = withObservables([], ({database}: WithDatabaseArgs) => ({currentUserId: observeCurrentUserId(database)}));

const enhance = withObservables(['category', 'isTablet', 'locale'], ({category, locale, isTablet, database, currentUserId}: EnhanceProps) => {
    const observedCategory = category.observe();
    const sortedChannels = observedCategory.pipe(
        switchMap((c) => getSortedChannels(database, c, locale)),
    );

    const dmMap = (p: PreferenceModel) => getDirectChannelName(p.name, currentUserId);

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

    const hiddenGmIds = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_GROUP_CHANNEL_SHOW, undefined, 'false').
        observeWithColumns(['value']).pipe(switchMap(mapPrefName));

    let limit = of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
    if (category.type === DMS_CATEGORY) {
        limit = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
            observeWithColumns(['value']).pipe(
                switchMap((val) => {
                    return val[0] ? of$(parseInt(val[0].value, 10)) : of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
                }),
            );
    }

    const hiddenChannelIds = combineLatest([hiddenDmIds, hiddenGmIds]).pipe(switchMap(
        ([a, b]) => of$(new Set(a.concat(b))),
    ));

    const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
        );

    const notifyProps = observeAllMyChannelNotifyProps(database);
    const lastUnreadId = isTablet ? observeLastUnreadChannelId(database) : of$(undefined);
    const unreadChannelIds = category.myChannels.observeWithColumns(['mentions_count', 'is_unread']).pipe(
        combineLatestWith(unreadsOnTop, notifyProps, lastUnreadId),
        map(([my, unreadTop, settings, lastUnread]) => {
            if (!unreadTop) {
                return new Set();
            }
            return my.reduce<Set<string>>((set, m) => {
                const isMuted = settings[m.id]?.mark_unread === 'mention';
                if ((isMuted && m.mentionsCount) || (!isMuted && m.isUnread) || m.id === lastUnread) {
                    set.add(m.id);
                }
                return set;
            }, new Set());
        }),
    );

    const currentChannelId = observeCurrentChannelId(database);
    const filtered = sortedChannels.pipe(
        combineLatestWith(currentChannelId, unreadChannelIds),
        map(([channels, ccId, unreadIds]) => {
            return channels.filter((c) => c && ((c.deleteAt > 0 && c.id === ccId) || !c.deleteAt) && !unreadIds.has(c.id));
        }),
    );

    return {
        limit,
        hiddenChannelIds,
        sortedChannels: filtered,
        category: observedCategory,
    };
});

export default withDatabase(withUserId(enhance(CategoryBody)));
