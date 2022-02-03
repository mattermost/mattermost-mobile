// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {DEFAULT_SERVER_MAX_FILE_SIZE} from '@constants/post_draft';
import {isMinimumServerVersion} from '@utils/helpers';

import DraftHandler from './draft_handler';

import type {WithDatabaseArgs} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM, DRAFT}} = MM_TABLES;

type OwnProps = {
    channelId: string;
    rootId?: string;
}
const enhanced = withObservables([], ({database, channelId, rootId = ''}: WithDatabaseArgs & OwnProps) => {
    const draft = database.get<DraftModel>(DRAFT).query(
        Q.where('channel_id', channelId),
        Q.where('root_id', rootId),
    ).observeWithColumns(['message', 'files']).pipe(switchMap((v) => of$(v[0])));

    const files = draft.pipe(switchMap((d) => of$(d?.files)));
    const message = draft.pipe(switchMap((d) => of$(d?.message)));

    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}) => of$(value as ClientConfig)),
    );

    const license = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.LICENSE).pipe(
        switchMap(({value}) => of$(value as ClientLicense)),
    );

    const canUploadFiles = combineLatest([config, license]).pipe(
        switchMap(([c, l]) => of$(
            c.EnableFileAttachments !== 'false' &&
                (l.IsLicensed === 'false' || l.Compliance === 'false' || c.EnableMobileFileUpload !== 'false'),
        ),
        ),
    );

    const maxFileSize = config.pipe(
        switchMap((cfg) => of$(parseInt(cfg.MaxFileSize || '0', 10) || DEFAULT_SERVER_MAX_FILE_SIZE)),
    );

    const maxFileCount = config.pipe(
        switchMap((cfg) => of$(isMinimumServerVersion(cfg.Version, 6, 0) ? 10 : 5)),
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
