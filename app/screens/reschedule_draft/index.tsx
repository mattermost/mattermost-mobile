// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeScheduledPostById} from '@queries/servers/scheduled_post';
import {observeCurrentUser} from '@queries/servers/user';

import RescheduledDraft from './reschedule_draft';

import type {WithDatabaseArgs} from '@typings/database/database';

export type RescheduleDraftProps = {
    draftId: string;
}

const enhance = withObservables([], ({database, draftId}: RescheduleDraftProps & WithDatabaseArgs) => ({
    currentUserTimezone: observeCurrentUser(database).pipe(switchMap((u) => of$(u?.timezone))),
    draft: observeScheduledPostById(database, draftId),
}));

export default withDatabase(enhance(RescheduledDraft));
