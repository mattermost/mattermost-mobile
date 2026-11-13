// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeRecurringScheduledPostsEnabled} from '@queries/servers/scheduled_post';
import {observeCurrentUser} from '@queries/servers/user';
import {ScheduledPostOptions} from '@screens/scheduled_post_options/scheduled_post_picker';

import type {WithDatabaseArgs} from '@typings/database/database';

export type ScheduledPostOptionsProps = {

    // The server refuses to schedule a recurring post that has attachments, so the draft's files
    // decide whether the recurrence toggle can be offered at all.
    hasFiles: boolean;
}

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserTimezone = observeCurrentUser(database).pipe(switchMap((u) => of$(u?.timezone)));
    return {
        currentUserTimezone,
        isRecurringEnabled: observeRecurringScheduledPostsEnabled(database),
    };
});

export default withDatabase(enhanced(ScheduledPostOptions));
