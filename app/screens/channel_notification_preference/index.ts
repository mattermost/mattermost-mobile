// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelSettings, observeIsMutedSetting} from '@queries/servers/channel';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import ChannelNotificationPreference from './channel_notification_preference';

import type {WithDatabaseArgs} from '@typings/database/database';

type CNFProps = WithDatabaseArgs & {
    channelId: string;
}
const enhanced = withObservables([], ({channelId, database}: CNFProps) => {
    const settings = observeChannelSettings(database, channelId);
    const notifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push)),
    );
    const notifyThreadReplies = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push_threads)),
    );

    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        isChannelMuted: observeIsMutedSetting(database, channelId),
        notifyLevel,
        notifyThreadReplies,
    };
});
export default withDatabase(enhanced(ChannelNotificationPreference));
