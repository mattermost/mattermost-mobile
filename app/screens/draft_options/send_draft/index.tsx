// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {INITIAL_PRIORITY} from '@app/components/post_draft/send_handler/send_handler';
import {General, Permissions} from '@constants';
import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeFirstDraft, queryDraft} from '@queries/servers/drafts';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeConfigBooleanValue, observeConfigIntValue, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';

import SendDraft from './send_draft';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props ={
    rootId: string;
    channelId: string;
} & WithDatabaseArgs;

const enhanced = withObservables([], ({database, rootId, channelId}: Props) => {
    const channel = observeChannel(database, channelId);

    const currentUserId = observeCurrentUserId(database);
    const currentUser = currentUserId.pipe(
        switchMap((id) => observeUser(database, id)),
    );
    const userIsOutOfOffice = currentUser.pipe(
        switchMap((u) => of$(u?.status === General.OUT_OF_OFFICE)),
    );

    const postPriority = queryDraft(database, channelId, rootId).observeWithColumns(['metadata']).pipe(
        switchMap(observeFirstDraft),
        switchMap((d) => {
            if (!d?.metadata?.priority) {
                return of$(INITIAL_PRIORITY);
            }

            return of$(d.metadata.priority);
        }),
    );

    const enableConfirmNotificationsToChannel = observeConfigBooleanValue(database, 'EnableConfirmNotificationsToChannel');
    const maxMessageLength = observeConfigIntValue(database, 'MaxPostSize', MAX_MESSAGE_LENGTH_FALLBACK);
    const persistentNotificationInterval = observeConfigIntValue(database, 'PersistentNotificationIntervalMinutes');
    const persistentNotificationMaxRecipients = observeConfigIntValue(database, 'PersistentNotificationMaxRecipients');

    const useChannelMentions = combineLatest([channel, currentUser]).pipe(
        switchMap(([c, u]) => {
            if (!c) {
                return of$(true);
            }

            return u ? observePermissionForChannel(database, c, u, Permissions.USE_CHANNEL_MENTIONS, false) : of$(false);
        }),
    );

    const channelInfo = channel.pipe(switchMap((c) => (c ? observeChannelInfo(database, c.id) : of$(undefined))));
    const channelType = channel.pipe(switchMap((c) => of$(c?.type)));
    const channelName = channel.pipe(switchMap((c) => of$(c?.name)));
    const membersCount = channelInfo.pipe(
        switchMap((i) => (i ? of$(i.memberCount) : of$(0))),
    );

    const customEmojis = queryAllCustomEmojis(database).observe();

    return {
        channelType,
        channelName,
        currentUserId,
        enableConfirmNotificationsToChannel,
        maxMessageLength,
        membersCount,
        userIsOutOfOffice,
        useChannelMentions,
        customEmojis,
        persistentNotificationInterval,
        persistentNotificationMaxRecipients,
        postPriority,
    };
});

export default withDatabase(enhanced(SendDraft));
