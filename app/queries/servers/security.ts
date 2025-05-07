// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeConfigBooleanValue, observeLicense} from './system';

import type {Database} from '@nozbe/watermelondb';

export const observeCanUploadFiles = (database: Database) => {
    const enableFileAttachments = observeConfigBooleanValue(database, 'EnableFileAttachments', true);
    const enableMobileFileUpload = observeConfigBooleanValue(database, 'EnableMobileFileUpload', true);
    const license = observeLicense(database);

    return combineLatest([enableFileAttachments, enableMobileFileUpload, license]).pipe(
        switchMap(([efa, emfu, l]) => of$(
            efa &&
                (l?.IsLicensed !== 'true' || l?.Compliance !== 'true' || emfu),
        )),
        distinctUntilChanged(),
    );
};

export const observeCanDownloadFiles = (database: Database) => {
    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload', true);
    const license = observeLicense(database);

    return combineLatest([enableMobileFileDownload, license]).pipe(
        switchMap(([emfd, l]) => of$((l?.IsLicensed !== 'true' || l?.Compliance !== 'true' || emfd))),
        distinctUntilChanged(),
    );
};
