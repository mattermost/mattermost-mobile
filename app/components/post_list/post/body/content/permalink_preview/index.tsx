// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged, map} from 'rxjs/operators';

import {fetchUsersByIds} from '@actions/remote/user';
import {withServerUrl} from '@context/server';
import {observePost} from '@queries/servers/post';
import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUserOrFetch, observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';

import PermalinkPreview from './permalink_preview';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type OwnProps = WithDatabaseArgs & {
    post: PostModel;
    serverUrl?: string;
};

const enhance = withObservables(['post', 'serverUrl'], ({database, post, serverUrl}: OwnProps) => {
    const showPermalinkPreviews = observeConfigBooleanValue(database, 'EnablePermalinkPreviews', false);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const embedData = post.observe().pipe(
        map((p) => p.metadata?.embeds?.[0]?.data as PermalinkEmbedData | undefined),
        distinctUntilChanged(),
    );

    const currentUser = observeCurrentUser(database);
    const locale = currentUser.pipe(
        switchMap((u) => of$(u?.locale || 'en')),
        distinctUntilChanged(),
    );

    const author = embedData.pipe(
        switchMap((data) => {
            const userId = data?.post?.user_id;
            return userId ? observeUserOrFetch(database, serverUrl || '', userId, fetchUsersByIds) : of$(undefined);
        }),
    );

    const isOriginPostDeleted = embedData.pipe(
        switchMap((data) => {
            if (!data?.post_id) {
                return of$(false);
            }
            return observePost(database, data.post_id);
        }),
        map((p) => Boolean(p && typeof p === 'object' && 'deleteAt' in p && p.deleteAt && p.deleteAt > 0)),
    );

    return {
        showPermalinkPreviews,
        teammateNameDisplay,
        author,
        locale,
        isOriginPostDeleted,
        canDownloadFiles: observeCanDownloadFiles(database),
        enableSecureFilePreview: observeEnableSecureFilePreview(database),
        currentUser,
        embedData,
    };
});

export default withDatabase(withServerUrl(enhance(PermalinkPreview)));
