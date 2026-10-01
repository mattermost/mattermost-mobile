// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeAgentsVersion} from '@agents/database/queries/version';
import {SKU_SHORT_NAME} from '@constants/license';
import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import type {Database} from '@nozbe/watermelondb';

// SKUs at the Professional level or above in the plugin's tier chart
// (enterprise/license.go LevelFor), introduced in plugin 2.8.0.
const PROFESSIONAL_OR_HIGHER_SKUS = new Set<string>([
    SKU_SHORT_NAME.E10,
    SKU_SHORT_NAME.E20,
    SKU_SHORT_NAME.Professional,
    SKU_SHORT_NAME.Enterprise,
    SKU_SHORT_NAME.Entry,
    SKU_SHORT_NAME.EnterpriseAdvanced,
]);

// Before 2.8.0 the plugin gated analysis on pluginapi.IsE20LicensedOrDevelopment,
// which only accepts SKUs at core's Enterprise tier or above.
const ENTERPRISE_OR_HIGHER_SKUS = new Set<string>([
    SKU_SHORT_NAME.Enterprise,
    SKU_SHORT_NAME.Entry,
    SKU_SHORT_NAME.EnterpriseAdvanced,
]);

const isTierChartPlugin = (pluginVersion: string) => isMinimumServerVersion(pluginVersion, 2, 8, 0);

/**
 * Mirror of the Agents plugin's channel/thread summarization license check.
 * Developer mode (EnableDeveloper + EnableTesting) always passes. Plugin 2.8+
 * requires Professional or higher, falling back to license features for
 * unrecognised SKUs (the client license only carries LDAP, which marks
 * Professional); older plugins require Enterprise or higher.
 */
const isAgentsAnalysisLicensed = (
    license: ClientLicense | undefined,
    enableDeveloper: boolean,
    enableTesting: boolean,
    pluginVersion: string,
): boolean => {
    if (enableDeveloper && enableTesting) {
        return true;
    }

    const sku = license?.SkuShortName ?? '';
    if (!isTierChartPlugin(pluginVersion)) {
        return ENTERPRISE_OR_HIGHER_SKUS.has(sku);
    }

    if (PROFESSIONAL_OR_HIGHER_SKUS.has(sku)) {
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
        observeAgentsVersion(database),
    ]).pipe(
        map(([license, enableDeveloper, enableTesting, pluginVersion]) => isAgentsAnalysisLicensed(license, enableDeveloper, enableTesting, pluginVersion)),
        distinctUntilChanged(),
    );
};
