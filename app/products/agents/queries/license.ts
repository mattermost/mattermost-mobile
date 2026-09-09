// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

import {SKU_SHORT_NAME} from '@constants/license';
import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';

import type {Database} from '@nozbe/watermelondb';

const knownSkus = new Set<string>([
    SKU_SHORT_NAME.Professional,
    SKU_SHORT_NAME.Enterprise,
    SKU_SHORT_NAME.EnterpriseAdvanced,
    SKU_SHORT_NAME.Entry,
]);

/**
 * Whether the server license covers the plugin's licensed analysis features
 * (channel analysis, interval summaries, thread analysis — all gated by the
 * plugin's IsBasicsLicensed = enterprise tier). Mirrors the webapp's
 * checkEnterpriseLicensed: enterprise-tier SKUs pass, and unknown SKUs fall
 * back to the presence of a known enterprise feature flag.
 */
export function isAnalysisLicensed(license?: ClientLicense): boolean {
    if (!license) {
        return false;
    }

    const sku = license.SkuShortName;
    if (sku === SKU_SHORT_NAME.Enterprise || sku === SKU_SHORT_NAME.EnterpriseAdvanced || sku === SKU_SHORT_NAME.Entry) {
        return true;
    }

    if (!knownSkus.has(sku)) {
        return license.MessageExport === 'true';
    }

    return false;
}

/**
 * Observe whether the licensed agents analysis features are available.
 * The plugin treats a server configured for development (EnableTesting +
 * EnableDeveloper) as licensed, so mirror that here — otherwise mobile would
 * hide affordances the server would happily serve.
 */
export function observeIsAgentsAnalysisLicensed(database: Database) {
    return combineLatest([
        observeLicense(database),
        observeConfigBooleanValue(database, 'EnableTesting'),
        observeConfigBooleanValue(database, 'EnableDeveloper'),
    ]).pipe(
        map(([license, testing, developer]) => isAnalysisLicensed(license) || (testing && developer)),
    );
}
