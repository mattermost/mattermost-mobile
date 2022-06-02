// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePinnedPostsInChannel} from '@queries/servers/post';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import PinnedMessages from './pinned_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUser = observeCurrentUser(database);
    const posts = observePinnedPostsInChannel(database, channelId);

    return {
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        isCRTEnabled: observeIsCRTEnabled(database),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
        posts,
    };
});

export default withDatabase(enhance(PinnedMessages));
