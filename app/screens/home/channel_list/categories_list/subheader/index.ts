// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import SubHeader from './subheader';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
        );

    return {
        unreadsOnTop,
    };
});

export default withDatabase(enhanced(SubHeader));
