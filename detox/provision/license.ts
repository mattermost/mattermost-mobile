// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

type LicenseClientResponse = {IsLicensed?: string; SkuShortName?: string};
type ApiErrorBody = {message?: string};

export async function ensureTrialLicense(client: MattermostClient, token: string): Promise<void> {
    const licenseRes = await client.request<LicenseClientResponse>('GET', '/api/v4/license/client?format=old', undefined, token);
    const sku = licenseRes.data.SkuShortName?.toLowerCase();
    if (licenseRes.data.IsLicensed === 'true' && sku !== 'entry') {
        logInfo('Server already has Enterprise license.');
        return;
    }

    if (licenseRes.data.IsLicensed === 'true') {
        logInfo('Entry license detected — requesting trial upgrade for in-app Report a Problem flows...');
    } else {
        logInfo('No Enterprise license — requesting trial...');
    }
    const trialRes = await client.request<ApiErrorBody>('POST', '/api/v4/trial-license', {
        users: 1000,
        terms_accepted: true,
        receive_emails_accepted: true,
        contact_name: 'E2E Test',
        contact_email: 'admin@example.mattermost.com',
        company_name: 'Mattermost E2E',
        company_country: 'US',
        company_size: 'ONE_TO_50',
    }, token);

    if (trialRes.status >= 400) {
        logWarn(`Trial license request failed (HTTP ${trialRes.status}): ${trialRes.data.message || JSON.stringify(trialRes.data)}`);
        return;
    }

    logInfo('Trial Enterprise license activated.');
}
