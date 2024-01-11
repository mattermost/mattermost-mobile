// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeFileById} from '@queries/servers/file';
import {observeConfigValue} from '@queries/servers/system';

import ChannelBookmark from './channel_bookmark';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

type Props = WithDatabaseArgs & {
    bookmark: ChannelBookmarkModel;
}

const enhanced = withObservables([], ({bookmark, database}: Props) => {
    return {
        bookmark: bookmark.observe(),
        file: observeFileById(database, bookmark.fileId || ''),
        siteURL: observeConfigValue(database, 'SiteURL'),
    };
});

export default withDatabase(enhanced(ChannelBookmark));
