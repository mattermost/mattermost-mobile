// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeBookmarks} from '@queries/servers/channel_bookmark';
import {observeCanDownloadFiles, observeCanUploadFiles, observeConfigBooleanValue, observeCurrentUserId} from '@queries/servers/system';

import ChannelBookmarks from './channel_bookmarks';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables([], ({channelId, database}: Props) => {
    return {
        bookmarks: observeBookmarks(database, channelId),
        canDownloadFiles: observeCanDownloadFiles(database),
        canUploadFiles: observeCanUploadFiles(database),
        currentUserId: observeCurrentUserId(database),
        publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default withDatabase(enhanced(ChannelBookmarks));
