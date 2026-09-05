// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {SKU_SHORT_NAME} from '@constants/license';
import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';

import type {Database} from '@nozbe/watermelondb';

// SKUs the server's LicenseToLicenseTier recognises; any other SKU is unknown
// and may only qualify through the MessageExport feature fallback.
const KNOWN_SKUS = new Set<string>([
    SKU_SHORT_NAME.Professional,
    SKU_SHORT_NAME.Enterprise,
    SKU_SHORT_NAME.EnterpriseAdvanced,
    SKU_SHORT_NAME.Entry,
]);

/**
 * Mirror of the Agents plugin's IsE20LicensedOrDevelopment / webapp
 * useIsBasicsLicensed check: enterprise-tier SKU (entry, enterprise,
 * advanced), unknown-SKU MessageExport fallback, or developer mode
 * (EnableDeveloper + EnableTesting).
 */
export const isAgentsAnalysisLicensed = (
    license: ClientLicense | undefined,
    enableDeveloper: boolean,
    enableTesting: boolean,
): boolean => {
    if (enableDeveloper && enableTesting) {
        return true;
    }

    const sku = license?.SkuShortName ?? '';
    if (sku === SKU_SHORT_NAME.Entry || sku === SKU_SHORT_NAME.Enterprise || sku === SKU_SHORT_NAME.EnterpriseAdvanced) {
        return true;
    }

    return !KNOWN_SKUS.has(sku) && license?.MessageExport === 'true';
};

/**
 * Observe whether the server is licensed for the Agents plugin's channel and
 * thread analysis features. The plugin rejects the analyze endpoints with a
 * 403 when this is false, so entry points should not render.
 */
export const observeIsAgentsAnalysisLicensed = (database: Database) => {
    return combineLatest([
        observeLicense(database),
        observeConfigBooleanValue(database, 'EnableDeveloper'),
        observeConfigBooleanValue(database, 'EnableTesting'),
    ]).pipe(
        switchMap(([license, enableDeveloper, enableTesting]) => of$(isAgentsAnalysisLicensed(license, enableDeveloper, enableTesting))),
        distinctUntilChanged(),
    );
};
