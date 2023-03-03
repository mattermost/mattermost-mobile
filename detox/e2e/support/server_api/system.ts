// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'path';

import jestExpect from 'expect';

import client from './client';
import {apiUploadFile, getResponseFromError} from './common';

// ****************************************************************
// System
// See https://api.mattermost.com/#tag/system
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/* eslint-disable no-console */

/**
 * Check system health.
 * @param {string} baseUrl - the base server URL
 */
export const apiCheckSystemHealth = async (baseUrl: string): Promise<any> => {
    const {data} = await apiPingServerStatus(baseUrl);
    jestExpect(data.status).toEqual('OK');
    jestExpect(data.database_status).toEqual('OK');
    jestExpect(data.filestore_status).toEqual('OK');
};

/**
 * Send a test email.
 * See https://api.mattermost.com/#operation/TestEmail
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiEmailTest = async (baseUrl: string): Promise<any> => {
    try {
        return await client.post(`${baseUrl}/api/v4/email/test`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get client license.
 * See https://api.mattermost.com/#operation/GetClientLicense
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {license} on success or {error, status} on error
 */
export const apiGetClientLicense = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/license/client?format=old`);

        return {license: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get configuration.
 * See https://api.mattermost.com/#operation/GetConfig
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {config} on success or {error, status} on error
 */
export const apiGetConfig = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/config`);

        return {config: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Ping server status.
 * See https://api.mattermost.com/#operation/GetPing
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {data} on success or {error, status} on error
 */
export const apiPingServerStatus = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/system/ping?get_server_status=true`);
        return {data: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Require server license to successfully continue.
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {license} on success or fail when no license
 */
export const apiRequireLicense = async (baseUrl: string): Promise<any> => {
    const {license} = await getClientLicense(baseUrl);

    if (license.IsLicensed !== 'true') {
        console.error('Server has no Enterprise license.');
    }
    jestExpect(license.IsLicensed).toEqual('true');

    return {license};
};

/**
 * Require server license with specific feature to successfully continue.
 * @param {string} baseUrl - the base server URL
 * @param {string} key - feature, e.g. LDAP
 * @return {Object} returns {license} on success or fail when no license or no license to specific feature.
 */
export const apiRequireLicenseForFeature = async (baseUrl: string, key = ''): Promise<any> => {
    const {license} = await getClientLicense(baseUrl);

    if (license.IsLicensed !== 'true') {
        console.error('Server has no Enterprise license.');
    }
    jestExpect(license.IsLicensed).toEqual('true');

    let hasLicenseKey = false;
    for (const [k, v] of Object.entries(license)) {
        if (k === key && v === 'true') {
            hasLicenseKey = true;
            break;
        }
    }

    if (!hasLicenseKey) {
        console.error(`Server has no license for "${key}" feature.`);
    }
    jestExpect(hasLicenseKey).toEqual(true);

    return {license};
};

/**
 * Require SMTP server to be running.
 * @param {string} baseUrl - the base server URL
 */
export const apiRequireSMTPServer = async (baseUrl: string) => {
    const {status} = await apiEmailTest(baseUrl);
    jestExpect(status).toEqual(200);
};

/**
 * Upload server license with file expected at "/detox/e2e/support/fixtures/mattermost-license.txt"
 * See https://api.mattermost.com/#operation/UploadLicenseFile
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiUploadLicense = async (baseUrl: string): Promise<any> => {
    const absFilePath = path.resolve(__dirname, '../../support/fixtures/mattermost-license.txt');
    return apiUploadFile('license', absFilePath, {url: `${baseUrl}/api/v4/license`, method: 'POST'});
};

/**
 * Get client license.
 * If no license, try to upload if license file is available at "/support/fixtures/mattermost-license.txt".
 * @return {Object} returns {license} on success or upload when no license or get updated license.
 */
export const getClientLicense = async (baseUrl: string): Promise<any> => {
    const {license} = await apiGetClientLicense(baseUrl);
    if (license.IsLicensed === 'true') {
        return {license};
    }

    // Upload a license if server is currently not loaded with license
    const response = await apiUploadLicense(baseUrl);
    if (response.error) {
        console.warn(response.error.message);
        return {license};
    }

    // Get an updated client license
    const out = await apiGetClientLicense(baseUrl);
    return {license: out.license};
};

export const System = {
    apiCheckSystemHealth,
    apiEmailTest,
    apiGetClientLicense,
    apiGetConfig,
    apiPingServerStatus,
    apiRequireLicense,
    apiRequireLicenseForFeature,
    apiRequireSMTPServer,
    apiUploadLicense,
    getClientLicense,
};

export default System;
