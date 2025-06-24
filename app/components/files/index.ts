// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryFilesForPost} from '@queries/servers/file';
import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {filesLocalPathValidation} from '@utils/file';

import Files from './files';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type EnhanceProps = WithDatabaseArgs & {
    post: PostModel;
}

const enhance = withObservables(['post'], ({database, post}: EnhanceProps) => {
    const publicLinkEnabled = observeConfigBooleanValue(database, 'EnablePublicLink');

    const filesInfo = queryFilesForPost(database, post.id).observeWithColumns(['local_path']).pipe(
        switchMap((fs) => from$(filesLocalPathValidation(fs, post.userId))),
    );

    return {
        canDownloadFiles: observeCanDownloadFiles(database),
        enableSecureFilePreview: observeEnableSecureFilePreview(database),
        postId: of$(post.id),
        postProps: of$(post.props),
        publicLinkEnabled,
        filesInfo,
    };
});

export default withDatabase(enhance(Files));
