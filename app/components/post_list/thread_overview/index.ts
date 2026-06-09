// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {withServerUrl} from '@context/server';
import {observePost, observePostSaved, queryPostReplies} from '@queries/servers/post';

import ThreadOverview from './thread_overview';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(
    ['rootId'],
    ({database, rootId, serverUrl}: WithDatabaseArgs & {rootId: string; serverUrl?: string}) => {
        return {
            rootPost: observePost(database, rootId),
            isSaved: observePostSaved(database, rootId, serverUrl),
            repliesCount: queryPostReplies(database, rootId).observeCount(false),
        };
    });

export default withDatabase(withServerUrl(enhanced(ThreadOverview)));
