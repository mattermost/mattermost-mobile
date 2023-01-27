// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeTeamIdByThread} from '@queries/servers/thread';

import FollowThreadOption from './follow_thread_option';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables(['thread'], ({thread, database}: {thread: ThreadModel} & WithDatabaseArgs) => {
    return {
        teamId: observeTeamIdByThread(database, thread),
    };
});

export default withDatabase(enhanced(FollowThreadOption));
