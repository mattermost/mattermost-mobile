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

// `posts` is NOT wired through withObservables on purpose. The Saved Messages
// screen is a freezeOnBlur bottom-tab that mounts once and stays mounted, so a
// `withObservables` subscription created at mount time predates any later save
// action. On the SQLite/JSI (device) adapter a pre-existing PREFERENCE-table
// Query.observe() subscription is not reliably notified of a preference CREATE
// (a fresh .fetch() sees it, the live subscription does not), so the screen
// stayed empty after a save. The component instead re-subscribes to the same
// observable on every focus (see saved_messages.tsx); a fresh subscription
// always reads current DB state on subscribe, sidestepping the missed notify.
const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
    };
});

export default withDatabase(enhance(SavedMessagesScreen));
