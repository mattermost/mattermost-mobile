// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {DEFAULT_SERVER_MAX_FILE_SIZE, MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {observePost} from '@queries/servers/post';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeConfigIntValue, observeMaxFileCount} from '@queries/servers/system';

import EditPost from './edit_post';

import type {WithDatabaseArgs} from '@typings/database/database';

export type EditPostProps = {
    postId: string;
    files?: FileInfo[];
    canDelete: boolean;
};

const enhance = withObservables([], ({database, postId}: EditPostProps & WithDatabaseArgs) => {
    const maxPostSize = observeConfigIntValue(database, 'MaxPostSize', MAX_MESSAGE_LENGTH_FALLBACK);
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileSize = observeConfigIntValue(database, 'MaxFileSize', DEFAULT_SERVER_MAX_FILE_SIZE);
    const maxFileCount = observeMaxFileCount(database);

    const post = observePost(database, postId);

    return {
        post,
        maxPostSize,
        canUploadFiles,
        maxFileSize,
        maxFileCount,
    };
});

export default withDatabase(enhance(EditPost));
