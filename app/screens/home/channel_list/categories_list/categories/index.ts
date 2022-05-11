// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, combineLatestWith} from 'rxjs/operators';

import {queryAllChannelDrafts} from '@app/queries/servers/drafts';
import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryCategoriesByTeamIds, queryCategoryChannelsByTeam} from '@queries/servers/categories';
import {queryJoinedChannels, queryMyChannelSettingsByTeam, queryMyChannelsForTeam} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentTeamId, observeCurrentUserId, observeLastUnreadChannelId, observeOnlyUnreads} from '@queries/servers/system';
import {getDirectChannelName} from '@utils/channel';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const dmNames = (id: string) => (v: PreferenceModel) => getDirectChannelName(id, v.name);
const gmNames = (v: PreferenceModel) => v.name;
const enhanced = withObservables(
    [],
    ({database}: WithDatabaseArgs) => {
        const currentTeamId = observeCurrentTeamId(database);
        const currentUserId = observeCurrentUserId(database);
        const categories = currentTeamId.pipe(switchMap((ctid) => queryCategoriesByTeamIds(database, [ctid]).observeWithColumns(['sort_order', 'collapsed', 'muted'])));
        const hiddenDmNames = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, undefined, 'false').observeWithColumns(['value']).pipe(
            combineLatestWith(currentUserId),
            switchMap(([prefs, id]) => of$(prefs.map(dmNames(id)))),
        );
        const hiddenGmNames = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_GROUP_CHANNEL_SHOW, undefined, 'false').observeWithColumns(['value']).pipe(
            switchMap((prefs) => of$(prefs.map(gmNames))),
        );
        const hiddenChannels = combineLatest([hiddenDmNames, hiddenGmNames]).pipe(
            switchMap(([a, b]) => of$(new Set(a.concat(b)))),
        );
        const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
            );

        const dmLimit = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_LIMIT_DMS).
            observeWithColumns(['value']).pipe(
                switchMap((val) => {
                    return val[0] ? of$(parseInt(val[0].value, 10)) : of$(Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT);
                }),
            );

        return {
            categories,
            onlyUnreads: observeOnlyUnreads(database),
            unreadsOnTop,
            allChannels: currentTeamId.pipe(switchMap((ctid) => queryJoinedChannels(database, ctid).observe())),
            allMyChannels: currentTeamId.pipe(switchMap((ctid) => queryMyChannelsForTeam(database, ctid).observe())),
            allCategoriesChannels: currentTeamId.pipe(switchMap((ctid) => queryCategoryChannelsByTeam(database, ctid).observe())),
            hiddenChannels,
            dmLimit,
            allChannelSettings: currentTeamId.pipe(switchMap((ctid) => queryMyChannelSettingsByTeam(database, ctid).observe())),
            lastUnreadId: observeLastUnreadChannelId(database),
            currentChannelId: observeCurrentChannelId(database),
            currentUserId,
            drafts: queryAllChannelDrafts(database).observeWithColumns(['message', 'files']),
        };
    });

export default withDatabase(enhanced(Categories));
