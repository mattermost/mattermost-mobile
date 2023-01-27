// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeIsMutedSetting} from '@queries/servers/channel';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelNotificationPreference from './channel_notification_preference';

import type {WithDatabaseArgs} from '@typings/database/database';

type CNFProps = WithDatabaseArgs & {
    channelId: string;
}
const enhanced = withObservables([], ({channelId, database}: CNFProps) => {
    return {
        currentUser: observeCurrentUser(database),
        isCRTEnabled: observeIsCRTEnabled(database),
        isChannelMuted: observeIsMutedSetting(database, channelId),
    };
});

export default withDatabase(enhanced(ChannelNotificationPreference));
