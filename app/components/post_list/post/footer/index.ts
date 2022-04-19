// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeTeamIdByThreadId, queryThreadParticipants} from '@queries/servers/thread';

import Footer from './footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables(
    ['thread'],
    ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
        return {
            participants: queryThreadParticipants(database, thread.id).observe(),
            teamId: observeTeamIdByThreadId(database, thread.id),
        };
    },
);

export default withDatabase(enhanced(Footer));
