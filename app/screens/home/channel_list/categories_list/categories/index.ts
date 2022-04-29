// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-nested-callbacks */
/**
 * --- Categories ---
 *
 * This file covers quite a lot of code that can seem convoluted at times. In essence,
 * it is pulling all the categories and associated channels that need to be displayed
 * in the sidebar.
 *
 * The categories themselves are ordered manually by the user, with the "Unread"
 * category optionally displayed on top (based on the user's sidebar config).
 *
 * The channels inside the category can be sorted manually, by most recent or
 * alphabetically based on the the channel display name. The "recent" data parameter
 * is available in the MyChannel model, "display_name" in the Channel model and the
 * "sort_order" in the CategoryChannel [join] table.
 *
 * These channels can also be hidden, archived, muted, deleted and so forth, and values
 * for those live in the user's preferences.
 *
 * All this eventually goes into a "SectionList", so the final object is an array of
 * "sections", which includes data for the category header, and the channel list items
 *
 * The methods used will have small explainers on top to help guide you, but do reach
 * out to Shaz (@shazm) or Elias (@enahum) for any questions or help.
 */

import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap, concatAll} from 'rxjs/operators';

import {DMS_CATEGORY} from '@app/constants/categories';
import {observeCurrentUserId, observeLastUnreadChannelId} from '@app/queries/servers/system';
import {getDirectChannelName} from '@app/utils/channel';
import {General, Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {getChannelById, queryChannelsByNames, queryMyChannelSettingsByIds, queryMyChannelUnreads} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
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

type CA = [
    a: Array<ChannelModel | null>,
    b: ChannelModel | undefined,
]

const concatenateChannelsArray = ([a, b]: CA) => {
    return of$(b ? a.filter((c) => c && c.id !== b.id).concat(b) : a);
};

const getHiddenChannelIds = (database: Database, currentUserId: string) => {
    const dmMap = (p: PreferenceModel) => getDirectChannelName(p.name, currentUserId);
    const hiddenDmIds = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, undefined, 'false').
        observe().pipe(
            switchMap((prefs: PreferenceModel[]) => {
                const names = prefs.map(dmMap);
                const channels = queryChannelsByNames(database, names).observe();

                return channels.pipe(
                    switchMap(mapChannelIds),
                );
            }),
        );

    const hiddenGmIds = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_GROUP_CHANNEL_SHOW, undefined, 'false').
        observe().pipe(switchMap(mapPrefName));

    return combineLatest([hiddenDmIds, hiddenGmIds]).pipe(switchMap(
        ([a, b]) => of$(new Set(a.concat(b))),
    ));
};

const getUnreadChannels = (database: Database, currentTeamId: string) => {
    const getC = (lastUnreadChannelId: string) => getChannelById(database, lastUnreadChannelId);

    const lastUnread = observeLastUnreadChannelId(database).pipe(
        switchMap(getC),
    );

    const unreads = queryMyChannelUnreads(database, currentTeamId).observe().pipe(
        map(getChannelsFromRelation),
        concatAll(),
    );

    return combineLatest([unreads, lastUnread]).pipe(
        switchMap(concatenateChannelsArray),
    );
};

type WithDatabaseProps = {
    currentTeamId: string;
    currentUserId: string;
    locale: string;
} & WithDatabaseArgs

const enhanced = withObservables(
    ['currentTeamId', 'currentUserId', 'locale'],
    ({currentTeamId, currentUserId, locale, database}: WithDatabaseProps) => {
        const observedCategories = queryCategoriesByTeamIds(database, [currentTeamId]).observeWithColumns(['sort_order']);
        const hiddenChannelIds = getHiddenChannelIds(database, currentUserId);

        const mapCategoryToSection = (category: CategoryModel) => {
            const observedCategory = category.observe();
            let sortedChannels = observedCategory.pipe(
                switchMap((c) => getSortedChannels(database, c, locale)),
            );

            // DM's are limited by user pref
            if (category.type === DMS_CATEGORY) {
                queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).observe().pipe(
                    switchMap((val) => {
                        const l = val[0] ? parseInt(val[0].value, 10) : Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT;

                        sortedChannels = sortedChannels.pipe(switchMap(
                            (channels) => of$(channels.slice(0, l - 1)), // Array's are 0 indexed
                        ));

                        return val;
                    }),
                );
            }

            // Remove hidden Channels
            sortedChannels = combineLatest([sortedChannels, hiddenChannelIds]).pipe(switchMap(
                ([channels, channelIds]) => of$(channels.filter((c) => (c ? channelIds.has(c.id) : true))),
            ));

            return {
                id: category.id,
                data: sortedChannels,
                category,
            };
        };

        const sections = observedCategories.pipe(map(
            (categories) => {
                return categories.sort((a, b) => a.sortOrder - b.sortOrder).map(mapCategoryToSection);
            },
        ));

        // If Unreads are On Top
        queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(switchMap(
                (prefs: PreferenceModel[]) => {
                    const unreadsOnTop = getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false);

                    if (unreadsOnTop) {
                        sections.pipe(switchMap(
                            (ss) => {
                                const unreadChannels = getUnreadChannels(database, currentTeamId);

                                // Remove unreads from sections
                                ss.forEach((s) => {
                                    s.data = combineLatest([s.data, unreadChannels]).pipe(switchMap(
                                        ([sectionChannels, unreadCs]) => of$(sectionChannels.filter((sc) => unreadCs.includes(sc))),
                                    ));

                                    return s;
                                });

                                // Create own unread section
                                const unreadSection = {
                                    id: 'UNREADS',
                                    data: unreadChannels,
                                    category: {
                                        id: 'unreads',
                                        type: 'unreads',
                                        collapsed: false,
                                        sortOrder: 0,
                                        hasChannels: of$(true),
                                    } as unknown as CategoryModel,
                                };

                                // Add to beginning of sections
                                ss.unshift(unreadSection);

                                return ss;
                            },
                        ));
                    }

                    return prefs;
                },
            ));

        return {
            sections,
        };
    });

const withCurrentUserId = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUserId(database),
}));

export default withDatabase(withCurrentUserId(enhanced(Categories)));
