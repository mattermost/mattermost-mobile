// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import ThreadFooter from './thread_footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables([], ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    return {

        // Get current user
        currentUserId: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
            switchMap(({value}) => of$(value)),
        ),
        participants: thread.participants.observe().pipe(
            switchMap((participants) => {
                // eslint-disable-next-line max-nested-callbacks
                const participantUserIds = participants.map((participant) => participant.userId);
                return database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(participantUserIds))).observe();
            }),
        ),
    };
});

export default withDatabase(enhanced(ThreadFooter));
