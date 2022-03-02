// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import Files from './files';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';

const enhance = withObservables(['post'], ({database, post}: {post: PostModel} & WithDatabaseArgs) => {
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

    return {
        authorId: of$(post.userId),
        canDownloadFiles,
        postId: of$(post.id),
        publicLinkEnabled,
    };
});

export default withDatabase(enhance(Files));
