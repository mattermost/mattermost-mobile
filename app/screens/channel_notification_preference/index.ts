// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelSettings} from '@queries/servers/channel';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';

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

    return {
        currentUser: observeCurrentUser(database),
        isCRTEnabled: observeIsCRTEnabled(database),
        notifyLevel,
    };
});

export default withDatabase(enhanced(ChannelNotificationPreference));
