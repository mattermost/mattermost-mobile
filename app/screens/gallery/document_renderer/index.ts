// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';

import DocumentRenderer from './document_renderer';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload');
    const complianceDisabled = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'false' || lcs?.Compliance === 'false')),
    );
    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        switchMap(([download, compliance]) => of$(compliance || download)),
    );

    return {
        canDownloadFiles,
    };
});

export default withDatabase(enhanced(DocumentRenderer));
