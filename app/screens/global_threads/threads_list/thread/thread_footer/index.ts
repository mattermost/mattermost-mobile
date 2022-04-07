// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentUserId} from '@queries/servers/system';
import {queryThreadParticipants} from '@queries/servers/thread';

import ThreadFooter from './thread_footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables([], ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    return {
        currentUserId: observeCurrentUserId(database),
        participants: queryThreadParticipants(database, thread.id).observe(),
    };
});

export default withDatabase(enhanced(ThreadFooter));
