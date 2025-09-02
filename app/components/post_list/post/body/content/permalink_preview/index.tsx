// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {fetchUsersByIds} from '@actions/remote/user';
import {withServerUrl} from '@context/server';
import {observePost} from '@queries/servers/post';
import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUserOrFetch, observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';

import PermalinkPreview from './permalink_preview';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['embedData', 'serverUrl'], ({database, embedData, serverUrl, parentLocation, parentPostId}: WithDatabaseArgs & {embedData: PermalinkEmbedData; serverUrl?: string; parentLocation?: string; parentPostId?: string}) => {
    const showPermalinkPreviews = observeConfigBooleanValue(database, 'EnablePermalinkPreviews', false);
    const teammateNameDisplay = observeTeammateNameDisplay(database);

    const userId = embedData?.post?.user_id;
    const author = userId ? observeUserOrFetch(database, serverUrl || '', userId, fetchUsersByIds) : of$(undefined);

    const currentUser = observeCurrentUser(database);
    const locale = currentUser.pipe(
        switchMap((u) => of$(u?.locale || 'en')),
        distinctUntilChanged(),
    );

    const isOriginPostDeleted = embedData?.post_id ? observePost(database, embedData.post_id).pipe(
        switchMap((p) => {
            const initialDeleted = Boolean(embedData?.post?.delete_at > 0 || embedData?.post?.state === 'DELETED');
            return of$(p ? p.deleteAt > 0 : initialDeleted);
        }),
        distinctUntilChanged(),
    ) : of$(false);

    const filesInfo = of$(embedData?.post?.metadata?.files || []);

    return {
        showPermalinkPreviews,
        teammateNameDisplay,
        author,
        locale,
        isOriginPostDeleted,
        canDownloadFiles: observeCanDownloadFiles(database),
        enableSecureFilePreview: observeEnableSecureFilePreview(database),
        filesInfo,
        parentLocation: of$(parentLocation),
        parentPostId: of$(parentPostId),
    };
});

export default withDatabase(withServerUrl(enhance(PermalinkPreview)));
