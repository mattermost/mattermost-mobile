// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPlaybookRunsByParticipant} from '@playbooks/database/queries/run';
import {observeCurrentUserId} from '@queries/servers/system';

import ParticipantPlaybooks from './participant_playbooks';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs;

const enhanced = withObservables([], ({database}: OwnProps) => {
    const currentUserId = observeCurrentUserId(database);

    return {
        currentUserId,
        cachedPlaybookRuns: currentUserId.pipe(
            switchMap((userId) =>
                (userId ? queryPlaybookRunsByParticipant(database, userId).observe() : of([])),
            ),
        ),
    };
});

export default withDatabase(enhanced(ParticipantPlaybooks));
