// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import DateInputElement from './date_input_element';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    userTimezone: observeCurrentUser(database).pipe(
        switchMap((user) => of$(getTimezone(user?.timezone))),
    ),
}));

export default withDatabase(enhanced(DateInputElement));
