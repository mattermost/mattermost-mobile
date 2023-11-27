// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeChannelInfo} from '@queries/servers/channel';

import SetHeaderBox from './set_header';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const channelInfo = observeChannelInfo(database, channelId);
    const isHeaderSet = channelInfo.pipe(
        switchMap((c) => of$(Boolean(c?.header))),

        // Channel info is fetched when we switch to the channel, and should update
        // the member count whenever a user joins or leaves the channel, so this should
        // save us a few renders.
        distinctUntilChanged(),
    );

    return {
        isHeaderSet,
    };
});

export default withDatabase(enhanced(SetHeaderBox));
