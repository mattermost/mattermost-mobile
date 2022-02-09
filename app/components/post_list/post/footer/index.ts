// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

import Footer from './footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {USER}} = MM_TABLES;

const enhanced = withObservables(
    ['thread'],
    ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => ({
        participants: thread.participants.observe().pipe(
            switchMap((participants) => {
                // eslint-disable-next-line max-nested-callbacks
                const participantIds = participants.map((participant) => participant.userId);
                return database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(participantIds))).observe();
            }),
        ),
    }),
);

export default withDatabase(enhanced(Footer));
