// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {License} from '@constants';

import {observeConfigBooleanValue, observeIsMinimumLicenseTier, observeLicense} from './system';

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

export const observeEnableSecureFilePreview = (database: Database) => {
    const enableSecureFilePreview = observeConfigBooleanValue(database, 'MobileEnableSecureFilePreview', false);
    const isAvailable = observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.EnterpriseAdvanced);

    return combineLatest([enableSecureFilePreview, isAvailable]).pipe(
        switchMap(([esfp, is]) => of$(is && esfp)),
        distinctUntilChanged(),
    );
};

export const observeAllowPdfLinkNavigation = (database: Database) => {
    const allowPdfLinkNavigation = observeConfigBooleanValue(database, 'MobileAllowPdfLinkNavigation', false);
    const isAvailable = observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.EnterpriseAdvanced);

    return combineLatest([allowPdfLinkNavigation, isAvailable]).pipe(
        switchMap(([esfp, is]) => of$(is && esfp)),
        distinctUntilChanged(),
    );
};
