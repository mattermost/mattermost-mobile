// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeCanWriteDmGm} from '@queries/servers/dm_gm_access';
import {observeCurrentUser} from '@queries/servers/user';
import {isDMorGM} from '@utils/channel';

import Acknowledgements from './acknowledgements';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhanced = withObservables(['post'], ({database, post}: WithDatabaseArgs & {post: PostModel}) => {
    const currentUser = observeCurrentUser(database);

    // Acknowledging is a write in a conversation. Channels keep acknowledgements read-gated only.
    const canAcknowledge = observeChannel(database, post.channelId).pipe(
        switchMap((c) => (c && isDMorGM(c) ? observeCanWriteDmGm(database) : of$(true))),
    );

    return {
        canAcknowledge,
        currentUserId: currentUser.pipe(switchMap((c) => of$(c?.id))),
        currentUserTimezone: currentUser.pipe(switchMap((c) => of$(c?.timezone))),
    };
});

export default compose(
    withDatabase,
    enhanced,
)(Acknowledgements);
