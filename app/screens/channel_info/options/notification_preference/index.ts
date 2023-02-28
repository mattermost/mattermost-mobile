// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeChannelSettings} from '@queries/servers/channel';
import {observeCurrentUser} from '@queries/servers/user';
import {getNotificationProps} from '@utils/user';

import NotificationPreference from './notification_preference';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const displayName = observeChannel(database, channelId).pipe(switchMap((c) => of$(c?.displayName)));
    const settings = observeChannelSettings(database, channelId);
    const userNotifyLevel = observeCurrentUser(database).pipe(switchMap((u) => of$(getNotificationProps(u).push)));
    const notifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push)),
    );

    return {
        displayName,
        notifyLevel,
        userNotifyLevel,
    };
});

export default withDatabase(enhanced(NotificationPreference));
