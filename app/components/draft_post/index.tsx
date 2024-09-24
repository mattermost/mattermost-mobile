// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeChannel} from '@app/queries/servers/channel';

import DraftPost from './draft_post';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    channelId: string;
} & WithDatabaseArgs;

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    return {
        channel: observeChannel(database, channelId),
    };
});

export default withDatabase(enhance(DraftPost));
