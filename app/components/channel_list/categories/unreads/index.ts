// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {concatAll, map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryMyChannelUnreads} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import {getChannelsFromRelation} from '../body';

import UnreadCategories from './unreads';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

type WithDatabaseProps = { currentTeamId: string } & WithDatabaseArgs

const enhanced = withObservables(['currentTeamId'], ({currentTeamId, database}: WithDatabaseProps) => {
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
    };
});

export default withDatabase(enhanced(UnreadCategories));
