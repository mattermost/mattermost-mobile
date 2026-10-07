// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {RenderPermissionAction} from '@constants/access_control';
import {DEFAULT_SERVER_MAX_FILE_SIZE, MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {withServerUrl} from '@context/server';
import {observePost} from '@queries/servers/post';
import {observeChannelActionDenied, observeRenderPermission} from '@queries/servers/render_permissions';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeConfigIntValue, observeMaxFileCount} from '@queries/servers/system';

import EditPost from './edit_post';

import type {WithDatabaseArgs} from '@typings/database/database';

export type EditPostProps = {
    postId: string;
    files?: FileInfo[];
    canDelete: boolean;
};

type EnhancedProps = EditPostProps & WithDatabaseArgs & {
    serverUrl: string;
};

const enhance = withObservables([], ({database, postId, serverUrl}: EnhancedProps) => {
    const maxPostSize = observeConfigIntValue(database, 'MaxPostSize', MAX_MESSAGE_LENGTH_FALLBACK);
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileSize = observeConfigIntValue(database, 'MaxFileSize', DEFAULT_SERVER_MAX_FILE_SIZE);
    const maxFileCount = observeMaxFileCount(database);

    const post = observePost(database, postId);
    const channelId = post.pipe(
        map((p) => p?.channelId),
        distinctUntilChanged(),
    );
    const canUploadFilesByPolicy = channelId.pipe(
        switchMap((id) => observeRenderPermission(database, serverUrl, id, RenderPermissionAction.UploadFileAttachment, true)),
    );
    const writeDenied = channelId.pipe(
        switchMap((id) => (id ? observeChannelActionDenied(database, serverUrl, id, RenderPermissionAction.ChannelWriteAccess) : of$(false))),
    );

    return {
        post,
        maxPostSize,
        canUploadFiles,
        canUploadFilesByPolicy,
        maxFileSize,
        maxFileCount,
        writeDenied,
    };
});

export default withDatabase(withServerUrl(enhance(EditPost)));
