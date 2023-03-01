// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelSettings, observeIsMutedSetting} from '@queries/servers/channel';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {getNotificationProps} from '@utils/user';

import ChannelNotificationPreferences from './channel_notification_preferences';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables([], ({channelId, database}: EnhancedProps) => {
    const settings = observeChannelSettings(database, channelId);
    const isCRTEnabled = observeIsCRTEnabled(database);
    const isMuted = observeIsMutedSetting(database, channelId);
    const notifyProps = observeCurrentUser(database).pipe(switchMap((u) => of$(getNotificationProps(u))));

    const notifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push)),
    );

    const notifyThreadReplies = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push_threads)),
    );

    const defaultLevel = notifyProps.pipe(
        switchMap((n) => of$(n?.push)),
    );
    const defaultThreadReplies = notifyProps.pipe(
        switchMap((n) => of$(n?.push_threads)),
    );

    return {
        isCRTEnabled,
        isMuted,
        notifyLevel,
        notifyThreadReplies,
        defaultLevel,
        defaultThreadReplies,
    };
});

export default withDatabase(enhanced(ChannelNotificationPreferences));
