// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeThreadById} from '@queries/servers/thread';

import ThreadFollowButton from './thread_follow_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['threadId'], ({threadId, database}: {threadId: string} & WithDatabaseArgs) => {
    return {
        isFollowing: observeThreadById(database, threadId).pipe(
            switchMap((thread) => of$(thread?.isFollowing)),
        ),
    };
});

export default withDatabase(enhanced(ThreadFollowButton));
