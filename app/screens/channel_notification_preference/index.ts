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

import ChannelNotificationPreference from './channel_notification_preference';

import type {WithDatabaseArgs} from '@typings/database/database';

type CNFProps = WithDatabaseArgs & {
    channelId: string;
}
const enhanced = withObservables([], ({channelId, database}: CNFProps) => {
    const settings = observeChannelSettings(database, channelId);
    const channelNotifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push)),
    );
    const channelNotifyThreadReplies = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push_threads)),
    );

    const notifyProps = observeCurrentUser(database).pipe(
        switchMap((u) => of$(u?.notifyProps ? getNotificationProps(u) : undefined)),
    );
    const globalDefault = notifyProps.pipe(
        switchMap((n) => of$(n?.push)),
    );
    const notifyThreadReplies = notifyProps.pipe(
        switchMap((n) => of$(n?.push_threads)),
    );

    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        isChannelMuted: observeIsMutedSetting(database, channelId),
        globalDefault,
        notifyThreadReplies,
        channelNotifyLevel,
        channelNotifyThreadReplies,
    };
});
export default withDatabase(enhanced(ChannelNotificationPreference));
