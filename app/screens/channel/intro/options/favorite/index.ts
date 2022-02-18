// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import FavoriteItem from './favorite';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => ({
    isFavorite: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_FAVORITE_CHANNEL, channelId).observeWithColumns(['value']).pipe(
        switchMap((prefs) => {
            return prefs.length ? of$(prefs[0].value === 'true') : of$(false);
        }),
    ),
}));

export default withDatabase(enhanced(FavoriteItem));
