// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeRecentReactions} from '@queries/servers/system';

import Picker from './picker';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    customEmojisEnabled: observeConfigBooleanValue(database, 'EnableCustomEmoji'),
    customEmojis: queryAllCustomEmojis(database).observe(),
    recentEmojis: observeRecentReactions(database),
    skinTone: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_EMOJI, Preferences.EMOJI_SKINTONE).
        observeWithColumns(['value']).pipe(
            switchMap((prefs) => of$(prefs?.[0]?.value ?? 'default')),
        ),
}));

export default withDatabase(enhanced(Picker));
