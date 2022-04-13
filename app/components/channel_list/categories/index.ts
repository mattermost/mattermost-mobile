// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {concatAll, map, switchMap} from 'rxjs/operators';

import {Preferences} from '@app/constants';
import {getPreferenceAsBool} from '@app/helpers/api/preference';
import {getChannelById, queryMyChannelUnreads} from '@app/queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@app/queries/servers/preference';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {observeCurrentChannelId, observeCurrentUserId, observeLastUnreadChannelId} from '@queries/servers/system';

import {getChannelsFromRelation} from './body';
import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PreferenceModel from '@typings/database/models/servers/preference';

type CA = [
    a: Array<ChannelModel | null>,
    b: ChannelModel | undefined,
]
const concatenateChannelsArray = ([a, b]: CA) => {
    return of$(b ? a.filter((c) => c && c.id !== b.id).concat(b) : a);
};

type WithDatabaseProps = { currentTeamId: string } & WithDatabaseArgs

const enhanced = withObservables(
    ['currentTeamId'],
    ({currentTeamId, database}: WithDatabaseProps) => {
        const currentChannelId = observeCurrentChannelId(database);
        const currentUserId = observeCurrentUserId(database);
        const categories = queryCategoriesByTeamIds(database, [currentTeamId]).observeWithColumns(['sort_order']);

        const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
            );

        const getC = (lastUnreadChannelId: string) => getChannelById(database, lastUnreadChannelId);

        const unreadChannels = unreadsOnTop.pipe(switchMap((gU) => {
            if (gU) {
                const lastUnread = observeLastUnreadChannelId(database).pipe(
                    switchMap(getC),
                );

                const unreads = queryMyChannelUnreads(database, currentTeamId).observe().pipe(
                    map(getChannelsFromRelation),
                    concatAll(),
                );

                const combined = combineLatest([unreads, lastUnread]).pipe(
                    switchMap(concatenateChannelsArray),
                );

                return combined;
            }
            return of$([]);
        }));

        return {
            unreadChannels,
            categories,
            currentUserId,
            currentChannelId,
        };
    });

export default withDatabase(enhanced(Categories));
