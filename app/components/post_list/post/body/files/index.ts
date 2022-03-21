// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$, from as from$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {fileExists} from '@utils/file';

import Files from './files';

import type {WithDatabaseArgs} from '@typings/database/database';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

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
    const config = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG);
    const enableMobileFileDownload = config.pipe(
        switchMap(({value}: {value: ClientConfig}) => of$(value.EnableMobileFileDownload !== 'false')),
    );

    const publicLinkEnabled = config.pipe(
        switchMap(({value}: {value: ClientConfig}) => of$(value.EnablePublicLink !== 'false')),
    );

    const complianceDisabled = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(
        switchMap(({value}: {value: ClientLicense}) => of$(value.IsLicensed === 'false' || value.Compliance === 'false')),
    );

    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        map(([download, compliance]) => compliance || download),
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
