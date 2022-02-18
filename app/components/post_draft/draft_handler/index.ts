// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {DEFAULT_SERVER_MAX_FILE_SIZE} from '@constants/post_draft';
import {queryDraft} from '@queries/servers/drafts';
import {observeConfig, observeLicense} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import DraftHandler from './draft_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
    rootId?: string;
}
const enhanced = withObservables([], ({database, channelId, rootId = ''}: WithDatabaseArgs & OwnProps) => {
    const draft = queryDraft(database, channelId, rootId).observeWithColumns(['message', 'files']).pipe(switchMap((v) => of$(v[0])));

    const files = draft.pipe(switchMap((d) => of$(d?.files)));
    const message = draft.pipe(switchMap((d) => of$(d?.message)));

    const config = observeConfig(database);

    const license = observeLicense(database);

    const canUploadFiles = combineLatest([config, license]).pipe(
        switchMap(([c, l]) => of$(
            c?.EnableFileAttachments === 'true' ||
                (l?.IsLicensed !== 'true' && l?.Compliance !== 'true' && c?.EnableMobileFileUpload === 'true'),
        ),
        ),
    );

    const maxFileSize = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg?.MaxFileSize || '0', 10) || DEFAULT_SERVER_MAX_FILE_SIZE)),
    );

    const maxFileCount = config.pipe(
        switchMap((cfg) => of$(isMinimumServerVersion(cfg?.Version || '', 6, 0) ? 10 : 5)),
    );

    return {
        files,
        message,
        maxFileSize,
        maxFileCount,
        canUploadFiles,
    };
});

export default withDatabase(enhanced(DraftHandler));
