// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {observeChannel, observeIsReadOnlyChannel} from '@queries/servers/channel';
import {queryDraft, observeFirstDraft} from '@queries/servers/drafts';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeCurrentChannelId} from '@queries/servers/system';
import {observeCurrentUser, observeUser} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

import PostDraft from './post_draft';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
    channelIsArchived?: boolean;
    rootId?: string;
}

const enhanced = withObservables(['channelId', 'rootId', 'channelIsArchived'], (ownProps: WithDatabaseArgs & OwnProps) => {
    const {database, rootId = ''} = ownProps;
    let channelId = of$(ownProps.channelId);
    if (!ownProps.channelId) {
        channelId = observeCurrentChannelId(database);
    }

    const draft = channelId.pipe(
        switchMap((cId) => queryDraft(database, cId, rootId).observeWithColumns(['message', 'files', 'metadata']).pipe(
            switchMap(observeFirstDraft),
        )),
    );

    const files = draft.pipe(switchMap((d) => of$(d?.files)));
    const message = draft.pipe(switchMap((d) => of$(d?.message)));

    const currentUser = observeCurrentUser(database);

    const channel = channelId.pipe(
        switchMap((id) => observeChannel(database, id!)),
    );

    const canPost = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => (c && u ? observePermissionForChannel(database, c, u, Permissions.CREATE_POST, true) : of$(true))));
    const channelIsArchived = channel.pipe(switchMap((c) => (ownProps.channelIsArchived ? of$(true) : of$(c?.deleteAt !== 0))));

    const channelIsReadOnly = observeIsReadOnlyChannel(database, ownProps.channelId);

    const deactivatedChannel = combineLatest([currentUser, channel]).pipe(
        switchMap(([u, c]) => {
            if (!u || !c) {
                return of$(false);
            }
            if (c.type !== General.DM_CHANNEL) {
                return of$(false);
            }
            const teammateId = getUserIdFromChannelName(u.id, c.name);
            if (teammateId) {
                return observeUser(database, teammateId).pipe(
                    switchMap((u2) => (u2 ? of$(Boolean(u2.deleteAt)) : of$(false))), // eslint-disable-line max-nested-callbacks
                );
            }
            return of$(true);
        }),
    );

    return {
        canPost,
        channelIsArchived,
        channelIsReadOnly,
        deactivatedChannel,
        files,
        message,
    };
});

export default React.memo(withDatabase(enhanced(PostDraft)));
