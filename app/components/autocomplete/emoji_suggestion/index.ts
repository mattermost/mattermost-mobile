// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import EmojiSuggestion from './emoji_suggestion';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

const emptyEmojiList: CustomEmojiModel[] = [];
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const customEmojisEnabled = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config) => of$(config.value.EnableCustomEmoji === 'true')),
        );
    return {
        customEmojis: customEmojisEnabled.pipe(
            switchMap((enabled) => (enabled ?
                database.get<CustomEmojiModel>(MM_TABLES.SERVER.CUSTOM_EMOJI).query().observe() :
                of$(emptyEmojiList)),
            ),
        ),
        skinTone: database.get<PreferenceModel>(MM_TABLES.SERVER.PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_EMOJI),
            Q.where('name', Preferences.EMOJI_SKINTONE),
        ).observe().pipe(
            switchMap((prefs) => of$(prefs?.[0]?.value ?? 'default')),
        ),
    };
});

export default withDatabase(enhanced(EmojiSuggestion));
