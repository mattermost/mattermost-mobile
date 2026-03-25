// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeChannelAutotranslation} from '@queries/servers/channel';

import ChannelAutotranslation from './channel_autotranslation';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const enabled = observeChannelAutotranslation(database, channelId);

    return {
        enabled,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName || ''))),
    };
});

export default withDatabase(enhanced(ChannelAutotranslation));

