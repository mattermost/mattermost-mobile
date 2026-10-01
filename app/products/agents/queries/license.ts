// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {SKU_SHORT_NAME} from '@constants/license';
import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';

import type {Database} from '@nozbe/watermelondb';

// SKUs at the Professional level or above in the plugin's tier chart
// (enterprise/license.go LevelFor).
const PROFESSIONAL_OR_HIGHER_SKUS = new Set<string>([
    SKU_SHORT_NAME.E10,
    SKU_SHORT_NAME.E20,
    SKU_SHORT_NAME.Professional,
    SKU_SHORT_NAME.Enterprise,
    SKU_SHORT_NAME.Entry,
    SKU_SHORT_NAME.EnterpriseAdvanced,
]);

/**
 * Mirror of the Agents plugin's channel/thread summarization capability
 * check: Professional or higher, or developer mode (EnableDeveloper +
 * EnableTesting). Other SKUs fall back to license features; the client
 * license only carries LDAP, which marks Professional.
 */
export const isAgentsAnalysisLicensed = (
    license: ClientLicense | undefined,
    enableDeveloper: boolean,
    enableTesting: boolean,
): boolean => {
    if (enableDeveloper && enableTesting) {
        return true;
    }

    if (PROFESSIONAL_OR_HIGHER_SKUS.has(license?.SkuShortName ?? '')) {
        return true;
    }

    return license?.LDAP === 'true';
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
