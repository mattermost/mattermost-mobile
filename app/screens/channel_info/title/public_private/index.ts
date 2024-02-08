// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelInfo} from '@queries/servers/channel';

import PublicPrivate from './public_private';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channelInfo = observeChannelInfo(database, channelId);
    const purpose = channelInfo.pipe(switchMap((ci) => of$(ci?.purpose)));

    return {
        purpose,
    };
});

export default withDatabase(enhanced(PublicPrivate));
