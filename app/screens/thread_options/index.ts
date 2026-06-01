// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {withServerUrl} from '@context/server';
import {observePost, observePostSaved} from '@queries/servers/post';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeThreadById} from '@queries/servers/thread';

import ThreadOptions from './thread_options';

import type {WithDatabaseArgs} from '@typings/database/database';

export type ThreadOptionsProps = {
    threadId: string;
};

type Props = ThreadOptionsProps & WithDatabaseArgs & {serverUrl: string};

const enhanced = withObservables(['threadId', 'serverUrl'], ({database, serverUrl, threadId}: Props) => {
    return {
        isSaved: observePostSaved(database, threadId, serverUrl),
        post: observePost(database, threadId),
        team: observeCurrentTeam(database),
        thread: observeThreadById(database, threadId),
    };
});

export default withDatabase(withServerUrl(enhanced(ThreadOptions)));
