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
 * Enable custom terms of service (uses latest created terms from the server).
 * Requires Enterprise license with CustomTermsOfService.
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
            EnableCustomTermsOfService: true,
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
            EnableCustomTermsOfService: false,
        },
    });
};

const TermsOfService = {
    apiCreateTermsOfService,
    apiEnableCustomTermsOfService,
    apiDisableCustomTermsOfService,
};

export default TermsOfService;
