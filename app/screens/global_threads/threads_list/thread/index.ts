// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observePost} from '@queries/servers/post';
import {observeUser} from '@queries/servers/user';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ThreadModel from '@typings/database/models/servers/thread';

const enhanced = withObservables([], ({database, thread}: WithDatabaseArgs & {thread: ThreadModel}) => {
    const post = observePost(database, thread.id);
    return {
        post,
        thread: thread.observe(),
        channel: post.pipe(
            switchMap((p) => (p?.channelId ? observeChannel(database, p.channelId) : of$(undefined))),
        ),
        author: post.pipe(
            switchMap((u) => (u?.userId ? observeUser(database, u.userId) : of$(undefined))),
        ),
    };
});

export default withDatabase(enhanced(Thread));
