// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import ThreadModel from '@typings/database/models/servers/thread';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables([], ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    const post = thread.post.observe();
    return {
        currentUser: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
            switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
        ),
        participants: thread.participants.observe().pipe(
            switchMap((participants) => {
                // eslint-disable-next-line max-nested-callbacks
                const participantIds = participants.map((participant) => participant.userId);
                return database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(participantIds))).observe();
            }),
        ),
        post,
        thread: thread.observe(),
        channel: post.pipe(
            switchMap((row) => row.channel.observe()),
            catchError(() => of$(undefined)),
        ),
        author: post.pipe(
            switchMap((row) => row.author.observe()),
            catchError(() => of$(undefined)),
        ),
    };
});

// export default withDatabase(withSystem(withPostAndParticipants(withChannel(Thread))));
export default withDatabase(enhanced(Thread));
