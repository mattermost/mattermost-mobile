// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';

import FileOptions from './file_options';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const license = observeLicense(database);
    const enablePublicLink = observeConfigBooleanValue(database, 'EnablePublicLink');
    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload');

    const complianceDisabled = license.pipe(switchMap((l) => of$(l?.IsLicensed === 'false' || l?.Compliance === 'false')));
    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        switchMap(([download, compliance]) => of$(compliance || download)),
    );
    return {
        canDownloadFiles,
        enablePublicLink,
    };
});

export default withDatabase(enhanced(FileOptions));
