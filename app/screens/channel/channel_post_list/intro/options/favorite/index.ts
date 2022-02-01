// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';

import FavoriteItem from './favorite';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const enhanced = withObservables([], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => ({
    isFavorite: database.get<PreferenceModel>(MM_TABLES.SERVER.PREFERENCE).query(
        Q.where('category', Preferences.CATEGORY_FAVORITE_CHANNEL),
        Q.where('name', channelId),
    ).observeWithColumns(['value']).pipe(
        switchMap((prefs) => {
            return prefs.length ? of$(prefs[0].value === 'true') : of$(false);
        }),
    ),
}));

export default withDatabase(enhanced(FavoriteItem));
