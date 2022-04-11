// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {concatAll, map, switchMap} from 'rxjs/operators';

import {Preferences} from '@app/constants';
import {getPreferenceAsBool} from '@app/helpers/api/preference';
import {queryMyChannelUnreads} from '@app/queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@app/queries/servers/preference';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';

import {getChannelsFromRelation} from './body';
import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

type WithDatabaseProps = { currentTeamId: string } & WithDatabaseArgs

const enhanced = withObservables(
    ['currentTeamId'],
    ({currentTeamId, database}: WithDatabaseProps) => {
        const currentChannelId = observeCurrentChannelId(database);
        const currentUserId = observeCurrentUserId(database);
        const categories = queryCategoriesByTeamIds(database, [currentTeamId]).observeWithColumns(['sort_order']);

        const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observe().
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
            );

        const unreadChannels = unreadsOnTop.pipe(switchMap((gU) => {
            if (gU) {
                return queryMyChannelUnreads(database, currentTeamId).observe().pipe(
                    map(getChannelsFromRelation),
                    concatAll(),
                );
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
