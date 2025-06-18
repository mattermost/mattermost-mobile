// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryUsersOnChannel} from '@queries/servers/channel';
import {observeScheduledPostEnabled} from '@queries/servers/scheduled_post';

import DraftInput from './draft_input';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const scheduledPostsEnabled = observeScheduledPostEnabled(database);
    const channelUsers = channelId ? queryUsersOnChannel(database, channelId).observe() : [];
    
    return {
        scheduledPostsEnabled,
        channelUsers,
    };
});

export default withDatabase(enhanced(DraftInput));
