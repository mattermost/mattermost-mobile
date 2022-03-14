// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {observeConfig, observeLicense} from '@queries/servers/system';

import Files from './files';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables(['post'], ({database, post}: {post: PostModel} & WithDatabaseArgs) => {
    const config = observeConfig(database);
    const enableMobileFileDownload = config.pipe(
        switchMap((cfg) => of$(cfg?.EnableMobileFileDownload !== 'false')),
    );

    const publicLinkEnabled = config.pipe(
        switchMap((cfg) => of$(cfg?.EnablePublicLink !== 'false')),
    );

    const complianceDisabled = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'false' || lcs?.Compliance === 'false')),
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
