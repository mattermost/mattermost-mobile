// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, from as from$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCanDownloadFiles} from '@queries/servers/file';
import {observeConfig} from '@queries/servers/system';
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
    const config = observeConfig(database);
    const canDownloadFiles = observeCanDownloadFiles(database);

    const publicLinkEnabled = config.pipe(
        switchMap((cfg) => of$(cfg?.EnablePublicLink !== 'false')),
    );

    const filesInfo = post.files.observeWithColumns(['local_path']).pipe(
        switchMap((fs) => from$(filesLocalPathValidation(fs, post.userId))),
    );

    return {
        canDownloadFiles,
        postId: of$(post.id),
        publicLinkEnabled,
        filesInfo,
    };
});

export default withDatabase(enhance(Files));
