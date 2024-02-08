// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeTeamIdByThreadId, observeThreadById} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';

import ThreadFollowButton from './thread_follow_button';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    threadId?: string;
};

const enhanced = withObservables(['threadId'], ({threadId, database}: Props) => {
    const thId = threadId || EphemeralStore.getCurrentThreadId();
    let tId = of$('');
    let isFollowing = of$(false);

    if (thId) {
        tId = observeTeamIdByThreadId(database, thId).pipe(
            switchMap((t) => of$(t || '')),
        );

        isFollowing = observeThreadById(database, thId).pipe(
            switchMap((thread) => of$(thread?.isFollowing)),
        );
    }

    return {
        isFollowing,
        threadId: of$(thId),
        teamId: tId,
    };
});

export default withDatabase(enhanced(ThreadFollowButton));
