// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import PostList from './post_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);

    return {
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        currentUserId: currentUser.pipe((switchMap((user) => of$(user?.id)))),
        currentUsername: currentUser.pipe((switchMap((user) => of$(user?.username)))),
    };
});

export default React.memo(withDatabase(enhanced(PostList)));
