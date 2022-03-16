// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables([], ({thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    const post = thread.post.observe();
    return {
        post,
        thread: thread.observe(),
        channel: post.pipe(
            switchMap((row) => row.channel.observe()),
            catchError(() => of$(undefined)),
        ),
        author: post.pipe(
            switchMap((row) => row.author.observe()),
            catchError(() => of$(undefined)),
        ),
    };
});

export default withDatabase(enhanced(Thread));
