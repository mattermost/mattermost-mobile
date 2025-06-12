// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {DEFAULT_SERVER_MAX_FILE_SIZE, MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {observeFilesForPost} from '@queries/servers/file';
import {observeCanUploadFiles, observeConfigIntValue, observeMaxFileCount} from '@queries/servers/system';

import EditPost from './edit_post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables([], ({database, post}: WithDatabaseArgs & { post: PostModel}) => {
    const maxPostSize = observeConfigIntValue(database, 'MaxPostSize', MAX_MESSAGE_LENGTH_FALLBACK);
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileSize = observeConfigIntValue(database, 'MaxFileSize', DEFAULT_SERVER_MAX_FILE_SIZE);
    const maxFileCount = observeMaxFileCount(database);

    const hasFilesAttached = observeFilesForPost(database, post.id).pipe(switchMap((files) => of$(files?.length > 0)));

    return {
        maxPostSize,
        hasFilesAttached,
        canUploadFiles,
        maxFileSize,
        maxFileCount,
    };
});

export default withDatabase(enhance(EditPost));
