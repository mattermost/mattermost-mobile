// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentUser} from '@queries/servers/user';

import RescheduledDraft from './reschedule_draft';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserTimezone = observeCurrentUser(database).pipe(switchMap((u) => of$(u?.timezone)));
    return {
        currentUserTimezone,
    };
});

export default withDatabase(enhance(RescheduledDraft));
