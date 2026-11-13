// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {RenderPermissionAction} from '@constants/access_control';
import {DEFAULT_SERVER_MAX_FILE_SIZE} from '@constants/post_draft';
import {withServerUrl} from '@context/server';
import {observeRenderPermission} from '@queries/servers/render_permissions';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeConfigIntValue, observeMaxFileCount} from '@queries/servers/system';

import DraftHandler from './draft_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    channelId: string;
    serverUrl: string;
};

const enhanced = withObservables(['channelId'], ({database, channelId, serverUrl}: EnhancedProps) => {
    const canUploadFiles = observeCanUploadFiles(database);
    const canUploadFilesByPolicy = observeRenderPermission(database, serverUrl, channelId, RenderPermissionAction.UploadFileAttachment, true);
    const maxFileSize = observeConfigIntValue(database, 'MaxFileSize', DEFAULT_SERVER_MAX_FILE_SIZE);
    const maxFileCount = observeMaxFileCount(database);

    return {
        maxFileSize,
        canUploadFiles,
        canUploadFilesByPolicy,
        maxFileCount,
    };
});

export default React.memo(withDatabase(withServerUrl(enhanced(DraftHandler))));
