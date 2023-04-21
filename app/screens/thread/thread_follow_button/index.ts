// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeTeamIdByThreadId, observeThreadById} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';

import ThreadFollowButton from './thread_follow_button';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    teamId?: string;
    threadId?: string;
};

const enhanced = withObservables(['threadId'], ({teamId, threadId, database}: Props) => {
    // Fallback in case teamId or threadId are not defined per navigation not setting the props bug.
    const thId = threadId || EphemeralStore.getCurrentThreadId();
    const tId = teamId ? of$(teamId) : observeTeamIdByThreadId(database, thId).pipe(
        switchMap((t) => of$(t || '')),
    );

    return {
        isFollowing: observeThreadById(database, thId).pipe(
            switchMap((thread) => of$(thread?.isFollowing)),
        ),
        threadId: of$(thId),
        teamId: tId,
    };
});

export default withDatabase(enhanced(ThreadFollowButton));
