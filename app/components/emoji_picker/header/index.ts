// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryEmojiPreferences} from '@queries/servers/preference';

import PickerHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    skinTone: queryEmojiPreferences(database, Preferences.EMOJI_SKINTONE).
        observeWithColumns(['value']).pipe(
            switchMap((prefs) => of$(prefs?.[0]?.value ?? 'default')),
        ),
}));

export default withDatabase(enhanced(PickerHeader));
