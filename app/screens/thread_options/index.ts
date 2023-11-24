// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observePost, observePostSaved} from '@queries/servers/post';
import {observeCurrentTeam} from '@queries/servers/team';

import ThreadOptions from './thread_options';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

type Props = WithDatabaseArgs & {
    thread: ThreadModel;
};

const enhanced = withObservables(['thread'], ({database, thread}: Props) => {
    return {
        isSaved: observePostSaved(database, thread.id),
        post: observePost(database, thread.id),
        team: observeCurrentTeam(database),
    };
});

export default withDatabase(enhanced(ThreadOptions));
