// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {NotificationLevel} from '@constants';
import {observeChannel, observeChannelSettings} from '@queries/servers/channel';
import {observeHasGMasDMFeature} from '@queries/servers/features';
import {observeCurrentUser} from '@queries/servers/user';
import {getNotificationProps} from '@utils/user';

import NotificationPreference from './notification_preference';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const channelType = channel.pipe(switchMap((c) => of$(c?.type)));
    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));
    const settings = observeChannelSettings(database, channelId);
    const userNotifyLevel = observeCurrentUser(database).pipe(switchMap((u) => of$(getNotificationProps(u).push)));
    const notifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push || NotificationLevel.DEFAULT)),
    );
    const hasGMasDMFeature = observeHasGMasDMFeature(database);

    return {
        displayName,
        notifyLevel,
        userNotifyLevel,
        channelType,
        hasGMasDMFeature,
    };
});

export default withDatabase(enhanced(NotificationPreference));
