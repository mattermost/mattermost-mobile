// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryThreadParticipants} from '@queries/servers/thread';

import ThreadFooter from './thread_footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables([], ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    return {
        participants: queryThreadParticipants(database, thread.id).observe(),
    };
});

export default withDatabase(enhanced(ThreadFooter));
