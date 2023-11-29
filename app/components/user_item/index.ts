// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeTeammateNameDisplay} from '@queries/servers/user';

import UserItem from './user_item';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isCustomStatusEnabled = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');
    const currentUserId = observeCurrentUserId(database);
    const locale = observeCurrentUser(database).pipe(
        switchMap((u) => of$(u?.locale)),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    return {
        isCustomStatusEnabled,
        currentUserId,
        locale,
        teammateNameDisplay,
        hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
    };
});

export default withDatabase(enhanced(UserItem));
