// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';

import ThreadFollowButton from './thread_follow_button';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const {SERVER: {THREAD}} = MM_TABLES;

const enhanced = withObservables(['threadId'], ({threadId, database}: {threadId: string} & WithDatabaseArgs) => {
    return {
        thread: database.get<ThreadModel>(THREAD).findAndObserve(threadId),
    };
});

export default withDatabase(enhanced(ThreadFollowButton));
