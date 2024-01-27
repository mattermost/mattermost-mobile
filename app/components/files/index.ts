// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryFilesForPost} from '@queries/servers/file';
import {observeCanDownloadFiles, observeConfigBooleanValue} from '@queries/servers/system';
import {fileExists} from '@utils/file';

import Files from './files';

import type {WithDatabaseArgs} from '@typings/database/database';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';

type EnhanceProps = WithDatabaseArgs & {
    post: PostModel;
}

const filesLocalPathValidation = async (files: FileModel[], authorId: string) => {
    const filesInfo: FileInfo[] = [];
    for await (const f of files) {
        const info = f.toFileInfo(authorId);
        if (info.localPath) {
            const exists = await fileExists(info.localPath);
            if (!exists) {
                info.localPath = '';
            }
        }
        filesInfo.push(info);
    }

    return filesInfo;
};

const enhance = withObservables(['post'], ({database, post}: EnhanceProps) => {
    const publicLinkEnabled = observeConfigBooleanValue(database, 'EnablePublicLink');

    const filesInfo = queryFilesForPost(database, post.id).observeWithColumns(['local_path']).pipe(
        switchMap((fs) => from$(filesLocalPathValidation(fs, post.userId))),
    );

    return {
        canDownloadFiles: observeCanDownloadFiles(database),
        postId: of$(post.id),
        postProps: of$(post.props),
        publicLinkEnabled,
        filesInfo,
    };
});

export default withDatabase(enhance(Files));
