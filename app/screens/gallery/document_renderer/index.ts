// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import DocumentRenderer from './document_renderer';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {CONFIG, LICENSE} = SYSTEM_IDENTIFIERS;
const {SERVER: {SYSTEM}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableMobileFileDownload = database.get<SystemModel>(SYSTEM).findAndObserve(CONFIG).pipe(
        switchMap(({value}) => of$(value.EnableMobileFileDownload !== 'false')),
    );
    const complianceDisabled = database.get<SystemModel>(SYSTEM).findAndObserve(LICENSE).pipe(
        switchMap(({value}) => of$(value.IsLicensed === 'false' || value.Compliance === 'false')),
    );
    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        switchMap(([download, compliance]) => of$(compliance || download)),
    );

    return {
        canDownloadFiles,
    };
});

export default withDatabase(enhanced(DocumentRenderer));
