// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';
import System from './system';

// ****************************************************************
// Terms of Service
// See https://api.mattermost.com/#tag/terms-of-service
// ****************************************************************

/**
 * Create custom terms of service.
 * See https://api.mattermost.com/#operation/CreateTermsOfService
 * @param {string} baseUrl - the base server URL
 * @param {string} text - markdown/plain terms body
 * @return {Object} returns {terms} on success or {error, status} on error
 */
export const apiCreateTermsOfService = async (baseUrl: string, text: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/terms_of_service`, {text});

        return {terms: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Enable custom terms of service.
 * Requires Enterprise license with CustomTermsOfService.
 *
 * The server field is `SupportSettings.CustomTermsOfServiceEnabled` (server
 * `model/config.go`). `EnableCustomTermsOfService` is the *client* config key the app reads;
 * it is derived in `config/client.go` as
 * `props["EnableCustomTermsOfService"] = FormatBool(*c.SupportSettings.CustomTermsOfServiceEnabled)`.
 * Patching the client key name instead is silently dropped as an unknown field — the patch
 * still returns 200 and ToS is never enabled, which is why apiAssertCustomTermsOfServiceActive
 * below verifies against the client config rather than trusting the patch response.
 *
 * @param {string} baseUrl - the base server URL
 * @param {number} reAcceptancePeriodDays - days until re-acceptance is required
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiEnableCustomTermsOfService = async (
    baseUrl: string,
    reAcceptancePeriodDays = 365,
): Promise<any> => {
    return System.apiUpdateConfig(baseUrl, {
        SupportSettings: {
            CustomTermsOfServiceEnabled: true,
            CustomTermsOfServiceReAcceptancePeriod: reAcceptancePeriodDays,
        },
    });
};

/**
 * Disable custom terms of service so other suites are not forced through ToS.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiDisableCustomTermsOfService = async (baseUrl: string): Promise<any> => {
    return System.apiUpdateConfig(baseUrl, {
        SupportSettings: {
            CustomTermsOfServiceEnabled: false,
        },
    });
};

/**
 * Throw unless the client config the app actually consumes has custom ToS active for
 * `termsId`.
 *
 * Asserted against `/api/v4/config/client` rather than the admin config because that is what
 * `observeShowToS` reads, and because the two ToS keys only exist there: the server derives
 * `EnableCustomTermsOfService` from `CustomTermsOfServiceEnabled`, and sets
 * `CustomTermsOfServiceId` from `TermsOfService().GetLatest()` — it is not a config field, so
 * this also catches another suite's terms being the latest row.
 *
 * Client config is regenerated asynchronously, hence the poll rather than a single read.
 *
 * @param {string} baseUrl - the base server URL
 * @param {string} termsId - id the suite expects to be active
 */
export const apiAssertCustomTermsOfServiceActive = async (baseUrl: string, termsId: string): Promise<void> => {
    const enabled = await System.waitForClientConfigFlag(baseUrl, 'EnableCustomTermsOfService', 'true');
    if (!enabled) {
        throw new Error('apiAssertCustomTermsOfServiceActive: client config EnableCustomTermsOfService never became "true" — check the Enterprise licence covers CustomTermsOfService');
    }

    const {config, error, status} = await System.apiGetClientConfigOld(baseUrl);
    if (!config) {
        throw new Error(`apiAssertCustomTermsOfServiceActive: could not read client config (status ${status ?? 'unknown'}): ${error?.message ?? 'unknown error'}`);
    }
    if (config.CustomTermsOfServiceId !== termsId) {
        throw new Error(`apiAssertCustomTermsOfServiceActive: CustomTermsOfServiceId is "${String(config.CustomTermsOfServiceId)}", expected "${termsId}"`);
    }
};

/**
 * Throw unless the client config the app consumes reports custom ToS as off.
 *
 * The mirror of apiAssertCustomTermsOfServiceActive, and load-bearing for the same reason:
 * the config patch returns before the server regenerates client config, so handing the
 * server to the next suite straight after the disable can do so while it still serves
 * EnableCustomTermsOfService=true. That suite's app would fetch the stale config and get the
 * ToS modal in front of its login — the exact interference the disable is meant to end.
 *
 * @param {string} baseUrl - the base server URL
 */
export const apiAssertCustomTermsOfServiceInactive = async (baseUrl: string): Promise<void> => {
    const disabled = await System.waitForClientConfigFlag(baseUrl, 'EnableCustomTermsOfService', 'false');
    if (!disabled) {
        throw new Error('apiAssertCustomTermsOfServiceInactive: client config EnableCustomTermsOfService never became "false" — the server may still force other suites through ToS');
    }
};

const TermsOfService = {
    apiCreateTermsOfService,
    apiEnableCustomTermsOfService,
    apiDisableCustomTermsOfService,
    apiAssertCustomTermsOfServiceActive,
    apiAssertCustomTermsOfServiceInactive,
};

export default TermsOfService;
