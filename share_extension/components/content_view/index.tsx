// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';

import ContentView from './content_view';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['database'], ({database}: WithDatabaseArgs) => ({
    currentUserId: observeCurrentUserId(database),
    currentChannelId: observeCurrentChannelId(database),
}));

export default enhanced(ContentView);

