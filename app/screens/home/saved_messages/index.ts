// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';

import SavedMessagesScreen from './saved_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

// `posts` is deliberately NOT wired through withObservables. Saved Messages is a
// freezeOnBlur bottom-tab that mounts once and stays mounted, so a subscription
// created here at mount time predates every later save. On the SQLite/JSI
// (device) adapter a pre-existing PREFERENCE-table Query.observe() is not
// reliably notified of a preference CREATE — a fresh .fetch() sees the new row,
// the live subscription never emits — so the screen stayed empty after saving a
// message. LokiJS re-emits, which is why unit tests never caught it.
//
// The component owns the same pipeline instead and re-subscribes on every focus
// (see saved_messages.tsx). A fresh subscription reads current DB state when it
// subscribes, which sidesteps the missed notify entirely.
const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
    };
});

export default withDatabase(enhance(SavedMessagesScreen));