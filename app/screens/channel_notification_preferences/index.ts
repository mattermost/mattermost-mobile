// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, combineLatestWith} from 'rxjs/operators';

import {NotificationLevel} from '@constants';
import {observeChannel, observeChannelSettings, observeIsMutedSetting} from '@queries/servers/channel';
import {observeHasGMasDMFeature} from '@queries/servers/features';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {isTypeDMorGM} from '@utils/channel';
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
    const channelType = observeChannel(database, channelId).pipe(switchMap((c) => of$(c?.type)));
    const hasGMasDMFeature = observeHasGMasDMFeature(database);

    const notifyLevel = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push || NotificationLevel.DEFAULT)),
    );

    const notifyThreadReplies = settings.pipe(
        switchMap((s) => of$(s?.notifyProps.push_threads)),
    );

    const defaultLevel = notifyProps.pipe(
        switchMap((n) => of$(n?.push)),
        combineLatestWith(hasGMasDMFeature, channelType),
        switchMap(([v, hasFeature, cType]) => {
            const shouldShowwithGMasDMBehavior = hasFeature && isTypeDMorGM(cType);

            let defaultLevelToUse = v;
            if (shouldShowwithGMasDMBehavior) {
                if (v === NotificationLevel.MENTION) {
                    defaultLevelToUse = NotificationLevel.ALL;
                }
            }

            return of$(defaultLevelToUse);
        }),
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
        channelType,
        hasGMasDMFeature,
    };
});

export default withDatabase(enhanced(ChannelNotificationPreferences));
