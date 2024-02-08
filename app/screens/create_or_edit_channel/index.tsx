// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';

import {observeChannel, observeChannelInfo} from '@queries/servers/channel';

import CreateOrEditChannel from './create_or_edit_channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId?: string;
}

const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & OwnProps) => {
    const channel = channelId ? observeChannel(database, channelId) : of$(undefined);
    const channelInfo = channelId ? observeChannelInfo(database, channelId) : of$(undefined);
    return {
        channel,
        channelInfo,
    };
});

export default withDatabase(enhanced(CreateOrEditChannel));
