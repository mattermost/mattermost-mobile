// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeConfigValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {isMinimumServerVersion} from '@utils/helpers';

import AccountScreen from './account';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const showFullName = observeConfigBooleanValue(database, 'ShowFullName');
    const version = observeConfigValue(database, 'Version');
    const enableCustomUserStatuses = observeConfigBooleanValue(database, 'EnableCustomUserStatuses').pipe(
        combineLatestWith(version),
        switchMap(([cfg, v]) => of$(cfg && isMinimumServerVersion(v || '', 5, 36))),
    );

    return {
        currentUser: observeCurrentUser(database),
        enableCustomUserStatuses,
        showFullName,
    };
});

export default withDatabase(enhanced(AccountScreen));
