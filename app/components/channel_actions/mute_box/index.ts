// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannelSettings} from '@queries/servers/channel';

import MuteBox from './mute_box';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => ({
    isMuted: observeChannelSettings(database, channelId).pipe(
        switchMap((s) => of$(s?.notifyProps?.mark_unread === General.MENTION)),
    ),
}));

export default withDatabase(enhanced(MuteBox));
