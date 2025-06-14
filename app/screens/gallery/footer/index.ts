// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePost} from '@queries/servers/post';
import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {observeConfigBooleanValue, observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import Footer from './footer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {GalleryItemType} from '@typings/screens/gallery';

type FooterProps = WithDatabaseArgs & {
    item: GalleryItemType;
}

const enhanced = withObservables(['item'], ({database, item}: FooterProps) => {
    const post = item.postId ? observePost(database, item.postId) : of$(undefined);
    const currentChannelId = observeCurrentChannelId(database);
    const currentUserId = observeCurrentUserId(database);

    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const author = post.pipe(
        switchMap((p) => {
            const id = p?.userId || item.authorId;
            if (id) {
                return observeUser(database, id);
            }

            return of$(undefined);
        }),
    );

    const channel = combineLatest([currentChannelId, post]).pipe(
        switchMap(([cId, p]) => {
            const id = p?.channelId || cId;
            return observeChannel(database, id);
        }),
    );
    const enablePostUsernameOverride = observeConfigBooleanValue(database, 'EnablePostUsernameOverride');
    const enablePostIconOverride = observeConfigBooleanValue(database, 'EnablePostIconOverride');
    const enablePublicLink = observeConfigBooleanValue(database, 'EnablePublicLink');
    const channelName = channel.pipe(switchMap((c) => of$(c?.displayName || '')));
    const isDirectChannel = channel.pipe(switchMap((c) => of$(c?.type === General.DM_CHANNEL)));

    return {
        author,
        canDownloadFiles: observeCanDownloadFiles(database),
        channelName,
        currentUserId,
        enablePostIconOverride,
        enablePostUsernameOverride,
        enablePublicLink,
        enableSecureFilePreview: observeEnableSecureFilePreview(database),
        isDirectChannel,
        post,
        teammateNameDisplay,
    };
});

export default withDatabase(enhanced(Footer));
