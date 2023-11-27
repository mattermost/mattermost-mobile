// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeChannel} from '@queries/servers/channel';
import {observeCanDownloadFiles, observeConfigBooleanValue} from '@queries/servers/system';

import ChannelFiles from './channel_files';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    return {
        channel,
        canDownloadFiles: observeCanDownloadFiles(database),
        publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default withDatabase(enhance(ChannelFiles));
