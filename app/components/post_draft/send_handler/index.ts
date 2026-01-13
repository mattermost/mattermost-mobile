// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, type Observable, of as of$, shareReplay} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {DRAFT_TYPE_SCHEDULED, type DraftType} from '@constants/draft';
import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeFirstDraft, queryDraft} from '@queries/servers/drafts';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeFirstScheduledPost, queryScheduledPost} from '@queries/servers/scheduled_post';
import {observeConfigBooleanValue, observeConfigIntValue, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';

import SendHandler, {INITIAL_PRIORITY} from './send_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    rootId: string;
    draftType?: DraftType;
    channelId: string;
    channelIsArchived?: boolean;
}

const enhanced = withObservables(['channelId', 'rootId', 'draftType'], (ownProps: WithDatabaseArgs & OwnProps) => {
    const database = ownProps.database;
    const {rootId, channelId, draftType} = ownProps;
    const channel = observeChannel(database, channelId);

    const currentUserId = observeCurrentUserId(database);
    const currentUser = currentUserId.pipe(
        switchMap((id) => observeUser(database, id)),
    );
    const userIsOutOfOffice = currentUser.pipe(
        switchMap((u) => of$(u?.status === General.OUT_OF_OFFICE)),
    );

    let metadata: Observable<PostMetadata>;
    if (draftType === DRAFT_TYPE_SCHEDULED) {
        metadata = queryScheduledPost(database, channelId, rootId).observeWithColumns(['metadata']).
            pipe(
                switchMap(observeFirstScheduledPost),
                switchMap((item) => of$(item?.metadata || {})),
                shareReplay({bufferSize: 1, refCount: true}),
            );
    } else {
        metadata = queryDraft(database, channelId, rootId).observeWithColumns(['metadata']).pipe(
            switchMap(observeFirstDraft),
            switchMap((item) => of$(item?.metadata || {})),
            shareReplay({bufferSize: 1, refCount: true}),
        );
    }

    const postPriority = metadata.pipe(
        switchMap((m) => of$(m?.priority || INITIAL_PRIORITY)),
        distinctUntilChanged(),
    );

    const postBoRConfig = metadata.pipe(
        switchMap((m) => {
            return of$(m?.borConfig || null);
        }),
        distinctUntilChanged(),
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
    const channelDisplayName = channel.pipe(switchMap((c) => of$(c?.displayName)));
    const membersCount = channelInfo.pipe(
        switchMap((i) => (i ? of$(i.memberCount) : of$(0))),
    );

    const customEmojis = queryAllCustomEmojis(database).observe();

    return {
        channelType,
        channelName,
        currentUserId,
        channelDisplayName,
        enableConfirmNotificationsToChannel,
        maxMessageLength,
        membersCount,
        userIsOutOfOffice,
        useChannelMentions,
        customEmojis,
        persistentNotificationInterval,
        persistentNotificationMaxRecipients,
        postPriority,
        postBoRConfig,
    };
});

export default withDatabase(enhanced(SendHandler));
