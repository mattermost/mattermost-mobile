// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {observeLicense, observeConfigBooleanValue} from '@queries/servers/system';

import OptionMenus from './option_menus';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload');

    const complianceDisabled = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'false' || lcs?.Compliance === 'false')),
    );

    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        map(([download, compliance]) => compliance || download),
    );

    return {
        canDownloadFiles,
        enablePublicLink: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(OptionMenus);
